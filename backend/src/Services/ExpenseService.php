<?php

namespace App\Services;

use App\Models\Expense;
use App\Utils\Database;
use App\Utils\FileUploader;
use Ramsey\Uuid\Uuid;

class ExpenseService
{
    private $expenseModel;
    private $db;
    private $fileUploader;
    private $notificationService;
    
    public function __construct()
    {
        $this->expenseModel = new Expense();
        $this->db = Database::getInstance();
        $this->fileUploader = new FileUploader();
        $this->notificationService = new NotificationService();
    }
    
    public function getAll($filters = [], $page = 1, $perPage = 5)
    {
        $sql = "SELECT e.*, p.project_code, p.name as project_name,
                u.first_name, u.last_name, u.email
                FROM expenses e
                INNER JOIN projects p ON e.project_id = p.id
                INNER JOIN users u ON e.user_id = u.id
                WHERE 1=1";
        $params = [];
        
        $countSql = "SELECT COUNT(*) as total FROM expenses e
                INNER JOIN projects p ON e.project_id = p.id
                INNER JOIN users u ON e.user_id = u.id
                WHERE 1=1";
        $countParams = [];
        
        if (isset($filters['project_id'])) {
            $sql .= " AND e.project_id = ?";
            $params[] = $filters['project_id'];
            $countSql .= " AND e.project_id = ?";
            $countParams[] = $filters['project_id'];
        }
        
        if (isset($filters['user_id'])) {
            $sql .= " AND e.user_id = ?";
            $params[] = $filters['user_id'];
            $countSql .= " AND e.user_id = ?";
            $countParams[] = $filters['user_id'];
        }
        
        if (isset($filters['status'])) {
            $sql .= " AND e.status = ?";
            $params[] = $filters['status'];
            $countSql .= " AND e.status = ?";
            $countParams[] = $filters['status'];
        }
        
        $countResult = $this->db->queryOne($countSql, $countParams);
        $total = $countResult['total'] ?? 0;
        
        $sql .= " ORDER BY e.spent_at DESC";
        $offset = ($page - 1) * $perPage;
        $sql .= " LIMIT " . (int)$perPage . " OFFSET " . (int)$offset;
        
        $data = $this->db->query($sql, $params);
        
        return [
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage
        ];
    }
    
    public function getById($id)
    {
        $sql = "SELECT e.*, p.project_code, p.name as project_name,
                u.first_name, u.last_name, u.email
                FROM expenses e
                INNER JOIN projects p ON e.project_id = p.id
                INNER JOIN users u ON e.user_id = u.id
                WHERE e.id = ?";
        
        return $this->db->queryOne($sql, [$id]);
    }
    
    public function create($data, $files = [])
    {
        $project = $this->db->queryOne(
            "SELECT id, status FROM projects WHERE id = ? AND deleted_at IS NULL",
            [$data['project_id']]
        );
        
        if (!$project) {
            return ['success' => false, 'message' => 'Project not found'];
        }
        
        if ($project['status'] === 'closed' || $project['status'] === 'cancelled' || $project['status'] === 'completed') {
            return ['success' => false, 'message' => 'Cannot add expense to closed, cancelled or completed project'];
        }
        
        $projectUser = $this->db->queryOne(
            "SELECT id FROM project_users WHERE project_id = ? AND user_id = ?",
            [$data['project_id'], $data['user_id']]
        );
        
        if (!$projectUser) {
            return ['success' => false, 'message' => 'User not assigned to this project'];
        }
        
        if (!is_numeric($data['amount']) || $data['amount'] <= 0) {
            return ['success' => false, 'message' => 'Invalid amount'];
        }
        
        // Check user balance using the view
        $userBalance = $this->db->queryOne(
            "SELECT * FROM user_allocation_balances 
             WHERE user_id = ? AND project_id = ?",
            [$data['user_id'], $data['project_id']]
        );
        
        if (!$userBalance || $userBalance['remaining_balance'] < $data['amount']) {
            return ['success' => false, 'message' => 'Insufficient allocation balance'];
        }
        
        $receiptImage = null;
        if (isset($files['receipt_image'])) {
            try {
                $receiptImage = $this->fileUploader->upload($files['receipt_image'], 'receipts');
            } catch (\Exception $e) {
                return ['success' => false, 'message' => 'Failed to upload receipt: ' . $e->getMessage()];
            }
        }
        
        $expenseId = Uuid::uuid4()->toString();
        $this->db->execute(
            "INSERT INTO expenses (id, project_id, user_id, amount, description, category, receipt_image, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $expenseId,
                $data['project_id'],
                $data['user_id'],
                $data['amount'],
                $data['description'],
                $data['category'] ?? null,
                $receiptImage,
                'pending'
            ]
        );
        
        $expense = $this->getById($expenseId);
        return ['success' => true, 'data' => $expense];
    }
    
    public function update($id, $data, $files = [])
    {
        $expense = $this->expenseModel->find($id);
        if (!$expense) {
            return ['success' => false, 'message' => 'Expense not found'];
        }
        
        if ($expense['status'] === 'approved') {
            return ['success' => false, 'message' => 'Cannot update approved expense'];
        }
        
        $updateFields = [];
        $params = [];
        
        if (isset($data['amount'])) {
            if (!is_numeric($data['amount']) || $data['amount'] <= 0) {
                return ['success' => false, 'message' => 'Invalid amount'];
            }
            $updateFields[] = "amount = ?";
            $params[] = $data['amount'];
        }
        
        if (isset($data['description'])) {
            $updateFields[] = "description = ?";
            $params[] = $data['description'];
        }
        
        if (isset($data['category'])) {
            $updateFields[] = "category = ?";
            $params[] = $data['category'];
        }
        
        if (isset($files['receipt_image'])) {
            try {
                if ($expense['receipt_image']) {
                    $this->fileUploader->delete($expense['receipt_image']);
                }
                $receiptImage = $this->fileUploader->upload($files['receipt_image'], 'receipts');
                $updateFields[] = "receipt_image = ?";
                $params[] = $receiptImage;
            } catch (\Exception $e) {
                return ['success' => false, 'message' => 'Failed to upload receipt: ' . $e->getMessage()];
            }
        }
        
        if (empty($updateFields)) {
            return ['success' => true, 'data' => $expense];
        }
        
        $params[] = $id;
        
        $sql = "UPDATE expenses SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $this->db->execute($sql, $params);
        
        $updatedExpense = $this->getById($id);
        return ['success' => true, 'data' => $updatedExpense];
    }
    
    public function delete($id)
    {
        $expense = $this->expenseModel->find($id);
        if (!$expense) {
            return ['success' => false, 'message' => 'Expense not found'];
        }
        
        if ($expense['status'] === 'approved') {
            return ['success' => false, 'message' => 'Cannot delete approved expense'];
        }
        
        if ($expense['receipt_image']) {
            $this->fileUploader->delete($expense['receipt_image']);
        }
        
        $this->db->execute("DELETE FROM expenses WHERE id = ?", [$id]);
        
        return ['success' => true, 'message' => 'Expense deleted successfully'];
    }
    
    public function approve($id, $approvedBy)
    {
        try {
            $this->db->beginTransaction();
            
            $expense = $this->expenseModel->find($id);
            if (!$expense) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Expense not found'];
            }
            
            if ($expense['status'] === 'approved') {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Expense already approved'];
            }
            
            // Check user balance using the view
            $userBalance = $this->db->queryOne(
                "SELECT * FROM user_allocation_balances 
                 WHERE user_id = ? AND project_id = ?",
                [$expense['user_id'], $expense['project_id']]
            );
            
            if (!$userBalance || $userBalance['remaining_balance'] < $expense['amount']) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Insufficient allocation balance'];
            }
            
            // Update expense status - this will automatically update the views
            $this->db->execute(
                "UPDATE expenses SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?",
                ['approved', $approvedBy, $id]
            );
            
            // Check if project should be completed (all allocated money spent AND had allocated funds initially)
            $updatedProjectBalance = $this->db->queryOne(
                "SELECT allocated_balance, total_spent FROM project_balances WHERE id = ?",
                [$expense['project_id']]
            );
            
            if ($updatedProjectBalance && 
                $updatedProjectBalance['allocated_balance'] <= 0 && 
                $updatedProjectBalance['total_spent'] > 0) {
                // Only complete if project had allocated funds and now they're all spent
                $this->db->execute(
                    "UPDATE projects SET status = 'completed', updated_at = NOW() WHERE id = ? AND status != 'completed'",
                    [$expense['project_id']]
                );
            }
            
            $this->db->commit();
            
            // Get expense details for notification
            $expenseDetails = $this->getById($id);
            
            // Create notification for the expense owner
            $this->notificationService->create(
                $expense['user_id'],
                'expense_approved',
                'Expense Approved',
                "Your expense of {$expenseDetails['amount']} for {$expenseDetails['description']} has been approved.",
                'expense',
                $id
            );
            
            $updatedExpense = $this->getById($id);
            return ['success' => true, 'data' => $updatedExpense];
            
        } catch (\Exception $e) {
            $this->db->rollback();
            return ['success' => false, 'message' => 'Failed to approve expense: ' . $e->getMessage()];
        }
    }
    
    public function reject($id, $approvedBy)
    {
        $expense = $this->expenseModel->find($id);
        if (!$expense) {
            return ['success' => false, 'message' => 'Expense not found'];
        }
        
        if ($expense['status'] === 'approved') {
            return ['success' => false, 'message' => 'Cannot reject approved expense'];
        }
        
        $this->db->execute(
            "UPDATE expenses SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?",
            ['rejected', $approvedBy, $id]
        );
        
        $updatedExpense = $this->getById($id);
        
        // Create notification for the expense owner
        $this->notificationService->create(
            $expense['user_id'],
            'expense_rejected',
            'Expense Rejected',
            "Your expense of {$updatedExpense['amount']} for {$updatedExpense['description']} has been rejected.",
            'expense',
            $id
        );
        
        return ['success' => true, 'data' => $updatedExpense];
    }
    
    public function getByProject($projectId, $page = 1, $perPage = 5)
    {
        return $this->getAll(['project_id' => $projectId], $page, $perPage);
    }
    
    public function getByUser($userId)
    {
        return $this->getAll(['user_id' => $userId]);
    }
}