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
        
        // Format amounts
        foreach ($data as &$record) {
            $record['amount'] = number_format((float)$record['amount'], 2, '.', '');
        }
        
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
        
        $expense = $this->db->queryOne($sql, [$id]);
        
        if ($expense) {
            $expense['amount'] = number_format((float)$expense['amount'], 2, '.', '');
        }
        
        return $expense;
    }
    
    public function create($data, $files = [])
    {
        try {
            $this->db->beginTransaction();
            
            // Validate project exists and is active
            $project = $this->db->queryOne(
                "SELECT id, status FROM projects WHERE id = ? AND deleted_at IS NULL",
                [$data['project_id']]
            );
            
            if (!$project) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Project not found'];
            }
            
            if ($project['status'] === 'closed' || $project['status'] === 'cancelled' || $project['status'] === 'completed') {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Cannot add expense to closed, cancelled or completed project'];
            }
            
            // Validate user is assigned to project
            $projectUser = $this->db->queryOne(
                "SELECT id FROM project_users WHERE project_id = ? AND user_id = ?",
                [$data['project_id'], $data['user_id']]
            );
            
            if (!$projectUser) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'User not assigned to this project'];
            }
            
            // Validate amount
            $amount = round((float)$data['amount'], 2);
            if ($amount <= 0) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Amount must be greater than zero'];
            }
            
            // Validate expense type (category) is provided
            if (empty($data['category'])) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Expense type is required'];
            }
            
            // Validate expense type exists for this project
            $expenseType = $this->db->queryOne(
                "SELECT id FROM project_expense_types WHERE project_id = ? AND name = ?",
                [$data['project_id'], $data['category']]
            );
            
            if (!$expenseType) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Invalid expense type for this project'];
            }
            
            // Check project allocation balance using project_allocations view
            $projectBalance = $this->db->queryOne(
                "SELECT * FROM project_allocations WHERE id = ?",
                [$data['project_id']]
            );
            
            if (!$projectBalance) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'No allocation found for this project'];
            }
            
            $remainingBalance = (float)$projectBalance['remaining_balance'];
            
            if ($remainingBalance < $amount) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Insufficient project balance. Available: UGX ' . number_format($remainingBalance, 2)];
            }
            
            // Handle receipt image upload
            $receiptImage = null;
            if (isset($files['receipt_image']) && $files['receipt_image']['error'] === UPLOAD_ERR_OK) {
                try {
                    $receiptImage = $this->fileUploader->upload($files['receipt_image'], 'receipts');
                } catch (\Exception $e) {
                    $this->db->rollback();
                    return ['success' => false, 'message' => 'Failed to upload receipt: ' . $e->getMessage()];
                }
            }
            
            $expenseId = Uuid::uuid4()->toString();
            $this->db->execute(
                "INSERT INTO expenses (id, project_id, user_id, amount, description, category, receipt_image, status, spent_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                [
                    $expenseId,
                    $data['project_id'],
                    $data['user_id'],
                    $amount,
                    $data['description'],
                    $data['category'],
                    $receiptImage,
                    'pending'
                ]
            );
            
            $this->db->commit();
            
            $expense = $this->getById($expenseId);
            return ['success' => true, 'data' => $expense];
            
        } catch (\Exception $e) {
            $this->db->rollback();
            return ['success' => false, 'message' => 'Failed to create expense: ' . $e->getMessage()];
        }
    }
    
    public function update($id, $data, $files = [])
    {
        try {
            $this->db->beginTransaction();
            
            $expense = $this->getById($id);
            if (!$expense) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Expense not found'];
            }
            
            if ($expense['status'] === 'approved') {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Cannot update approved expense'];
            }
            
            $updateFields = [];
            $params = [];
            
            if (isset($data['amount'])) {
                $newAmount = round((float)$data['amount'], 2);
                if ($newAmount <= 0) {
                    $this->db->rollback();
                    return ['success' => false, 'message' => 'Amount must be greater than zero'];
                }
                
                // Check if new amount exceeds project balance
                $currentAmount = (float)str_replace(',', '', $expense['amount']);
                $amountDifference = $newAmount - $currentAmount;
                
                if ($amountDifference > 0) {
                    $projectBalance = $this->db->queryOne(
                        "SELECT * FROM project_allocations WHERE id = ?",
                        [$expense['project_id']]
                    );
                    
                    if (!$projectBalance) {
                        $this->db->rollback();
                        return ['success' => false, 'message' => 'No allocation found for this project'];
                    }
                    
                    $remainingBalance = (float)$projectBalance['remaining_balance'];
                    
                    if ($remainingBalance < $amountDifference) {
                        $this->db->rollback();
                        return ['success' => false, 'message' => 'Insufficient project balance for increase. Available: UGX ' . number_format($remainingBalance, 2)];
                    }
                }
                
                $updateFields[] = "amount = ?";
                $params[] = $newAmount;
            }
            
            if (isset($data['description'])) {
                $updateFields[] = "description = ?";
                $params[] = $data['description'];
            }
            
            if (isset($data['category'])) {
                // Validate expense type exists for project
                $expenseType = $this->db->queryOne(
                    "SELECT id FROM project_expense_types WHERE project_id = ? AND name = ?",
                    [$expense['project_id'], $data['category']]
                );
                
                if (!$expenseType) {
                    $this->db->rollback();
                    return ['success' => false, 'message' => 'Invalid expense type for this project'];
                }
                
                $updateFields[] = "category = ?";
                $params[] = $data['category'];
            }
            
            if (isset($files['receipt_image']) && $files['receipt_image']['error'] === UPLOAD_ERR_OK) {
                try {
                    if ($expense['receipt_image']) {
                        $this->fileUploader->delete($expense['receipt_image']);
                    }
                    $receiptImage = $this->fileUploader->upload($files['receipt_image'], 'receipts');
                    $updateFields[] = "receipt_image = ?";
                    $params[] = $receiptImage;
                } catch (\Exception $e) {
                    $this->db->rollback();
                    return ['success' => false, 'message' => 'Failed to upload receipt: ' . $e->getMessage()];
                }
            }
            
            if (empty($updateFields)) {
                $this->db->commit();
                return ['success' => true, 'data' => $expense];
            }
            
            $params[] = $id;
            
            $sql = "UPDATE expenses SET " . implode(", ", $updateFields) . ", updated_at = NOW() WHERE id = ?";
            $this->db->execute($sql, $params);
            
            $this->db->commit();
            
            $updatedExpense = $this->getById($id);
            return ['success' => true, 'data' => $updatedExpense];
            
        } catch (\Exception $e) {
            $this->db->rollback();
            return ['success' => false, 'message' => 'Failed to update expense: ' . $e->getMessage()];
        }
    }
    
    public function delete($id)
    {
        try {
            $this->db->beginTransaction();
            
            $expense = $this->getById($id);
            if (!$expense) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Expense not found'];
            }
            
            if ($expense['status'] === 'approved') {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Cannot delete approved expense'];
            }
            
            if ($expense['receipt_image']) {
                try {
                    $this->fileUploader->delete($expense['receipt_image']);
                } catch (\Exception $e) {
                    // Continue even if file deletion fails
                }
            }
            
            $this->db->execute("DELETE FROM expenses WHERE id = ?", [$id]);
            
            $this->db->commit();
            return ['success' => true, 'message' => 'Expense deleted successfully'];
            
        } catch (\Exception $e) {
            $this->db->rollback();
            return ['success' => false, 'message' => 'Failed to delete expense: ' . $e->getMessage()];
        }
    }
    
    public function approve($id, $approvedBy)
    {
        try {
            $this->db->beginTransaction();
            
            $expense = $this->getById($id);
            if (!$expense) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Expense not found'];
            }
            
            if ($expense['status'] === 'approved') {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Expense already approved'];
            }
            
            // Check project balance using project_allocations view
            $projectBalance = $this->db->queryOne(
                "SELECT * FROM project_allocations WHERE id = ?",
                [$expense['project_id']]
            );
            
            if (!$projectBalance) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'No allocation found for this project'];
            }
            
            $expenseAmount = (float)str_replace(',', '', $expense['amount']);
            $remainingBalance = (float)$projectBalance['remaining_balance'];
            
            if ($remainingBalance < $expenseAmount) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Insufficient project balance. Available: UGX ' . number_format($remainingBalance, 2)];
            }
            
            // Update expense status - this will automatically update the views
            $this->db->execute(
                "UPDATE expenses SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?",
                ['approved', $approvedBy, $id]
            );
            
            // Check if project should be completed (all allocated money spent)
            $updatedProjectBalance = $this->db->queryOne(
                "SELECT * FROM project_allocations WHERE id = ?",
                [$expense['project_id']]
            );
            
            if ($updatedProjectBalance && 
                (float)$updatedProjectBalance['remaining_balance'] <= 0 && 
                (float)$updatedProjectBalance['total_spent'] > 0) {
                // Only complete if project had allocated funds and now they're all spent
                $this->db->execute(
                    "UPDATE projects SET status = 'completed', updated_at = NOW() WHERE id = ? AND status = 'active'",
                    [$expense['project_id']]
                );
            }
            
            $this->db->commit();
            
            // Create notification for the expense owner
            $this->notificationService->create(
                $expense['user_id'],
                'expense_approved',
                'Expense Approved',
                "Your expense of UGX {$expense['amount']} for {$expense['description']} has been approved.",
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
        try {
            $this->db->beginTransaction();
            
            $expense = $this->getById($id);
            if (!$expense) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Expense not found'];
            }
            
            if ($expense['status'] === 'approved') {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Cannot reject approved expense'];
            }
            
            $this->db->execute(
                "UPDATE expenses SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?",
                ['rejected', $approvedBy, $id]
            );
            
            $this->db->commit();
            
            $updatedExpense = $this->getById($id);
            
            // Create notification for the expense owner
            $this->notificationService->create(
                $expense['user_id'],
                'expense_rejected',
                'Expense Rejected',
                "Your expense of UGX {$expense['amount']} for {$expense['description']} has been rejected.",
                'expense',
                $id
            );
            
            return ['success' => true, 'data' => $updatedExpense];
            
        } catch (\Exception $e) {
            $this->db->rollback();
            return ['success' => false, 'message' => 'Failed to reject expense: ' . $e->getMessage()];
        }
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