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
    
    public function __construct()
    {
        $this->expenseModel = new Expense();
        $this->db = Database::getInstance();
        $this->fileUploader = new FileUploader();
    }
    
    public function getAll($filters = [])
    {
        $sql = "SELECT e.*, p.project_code, p.name as project_name,
                u.first_name, u.last_name, u.email
                FROM expenses e
                INNER JOIN projects p ON e.project_id = p.id
                INNER JOIN users u ON e.user_id = u.id
                WHERE 1=1";
        $params = [];
        
        if (isset($filters['project_id'])) {
            $sql .= " AND e.project_id = ?";
            $params[] = $filters['project_id'];
        }
        
        if (isset($filters['user_id'])) {
            $sql .= " AND e.user_id = ?";
            $params[] = $filters['user_id'];
        }
        
        if (isset($filters['status'])) {
            $sql .= " AND e.status = ?";
            $params[] = $filters['status'];
        }
        
        $sql .= " ORDER BY e.spent_at DESC";
        
        return $this->db->query($sql, $params);
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
            
            // Check user balance with row locking
            $userBalance = $this->db->queryOne(
                "SELECT * FROM user_allocation_balances 
                 WHERE user_id = ? AND project_id = ? FOR UPDATE",
                [$expense['user_id'], $expense['project_id']]
            );
            
            if (!$userBalance || $userBalance['remaining_balance'] < $expense['amount']) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Insufficient allocation balance'];
            }
            
            // Update expense status
            $this->db->execute(
                "UPDATE expenses SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?",
                ['approved', $approvedBy, $id]
            );
            
            // Update user allocation balance - deduct from remaining balance, add to spent
            $this->db->execute(
                "UPDATE user_allocation_balances 
                 SET total_spent = total_spent + ?,
                     remaining_balance = remaining_balance - ?,
                     updated_at = NOW()
                 WHERE user_id = ? AND project_id = ?",
                [$expense['amount'], $expense['amount'], $expense['user_id'], $expense['project_id']]
            );
            
            // Update project balance - deduct from allocated, add to spent
            $projectBalance = $this->db->queryOne(
                "SELECT * FROM project_balances WHERE id = ? FOR UPDATE",
                [$expense['project_id']]
            );
            
            if ($projectBalance) {
                $this->db->execute(
                    "UPDATE project_balances 
                     SET allocated_balance = allocated_balance - ?,
                         total_spent = total_spent + ?,
                         updated_at = NOW()
                     WHERE id = ?",
                    [$expense['amount'], $expense['amount'], $expense['project_id']]
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
            }
            
            $this->db->commit();
            
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
        return ['success' => true, 'data' => $updatedExpense];
    }
    
    public function getByProject($projectId)
    {
        return $this->getAll(['project_id' => $projectId]);
    }
    
    public function getByUser($userId)
    {
        return $this->getAll(['user_id' => $userId]);
    }
}