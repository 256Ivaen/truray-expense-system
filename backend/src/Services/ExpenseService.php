<?php

namespace App\Services;

use App\Models\Expense;
use App\Utils\Database;
use App\Utils\FileUploader;
use App\Middleware\AuthMiddleware;
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
    
    public function getExpenseSummary($filters = [])
    {
        $sql = "SELECT 
                COUNT(*) as total_expenses,
                SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_approved,
                SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as total_pending,
                SUM(CASE WHEN status = 'rejected' THEN amount ELSE 0 END) as total_rejected,
                SUM(amount) as total_amount,
                AVG(amount) as average_amount,
                MAX(amount) as highest_expense,
                MIN(amount) as lowest_expense
                FROM expenses e
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
        
        $summary = $this->db->queryOne($sql, $params);
        
        if (!$summary) {
            return [
                'total_expenses' => 0,
                'total_approved' => '0.00',
                'total_pending' => '0.00',
                'total_rejected' => '0.00',
                'total_amount' => '0.00',
                'average_amount' => '0.00',
                'highest_expense' => '0.00',
                'lowest_expense' => '0.00'
            ];
        }
        
        return [
            'total_expenses' => (int)$summary['total_expenses'],
            'total_approved' => number_format((float)$summary['total_approved'], 2, '.', ''),
            'total_pending' => number_format((float)$summary['total_pending'], 2, '.', ''),
            'total_rejected' => number_format((float)$summary['total_rejected'], 2, '.', ''),
            'total_amount' => number_format((float)$summary['total_amount'], 2, '.', ''),
            'average_amount' => number_format((float)$summary['average_amount'], 2, '.', ''),
            'highest_expense' => number_format((float)$summary['highest_expense'], 2, '.', ''),
            'lowest_expense' => number_format((float)$summary['lowest_expense'], 2, '.', '')
        ];
    }
    
    public function getUserAllocationSummary($userId)
    {
        $sql = "SELECT 
                COALESCE(SUM(a.total_allocated), 0) as total_allocated,
                COALESCE(SUM(a.total_spent), 0) as total_expenses,
                COALESCE(SUM(a.remaining_balance), 0) as allocation_balance
                FROM project_allocations a
                INNER JOIN project_users pu ON a.id = pu.project_id
                WHERE pu.user_id = ?";
        
        $summary = $this->db->queryOne($sql, [$userId]);
        
        if (!$summary) {
            return [
                'total_allocated' => '0.00',
                'total_expenses' => '0.00',
                'allocation_balance' => '0.00'
            ];
        }
        
        return [
            'total_allocated' => number_format((float)$summary['total_allocated'], 2, '.', ''),
            'total_expenses' => number_format((float)$summary['total_expenses'], 2, '.', ''),
            'allocation_balance' => number_format((float)$summary['allocation_balance'], 2, '.', '')
        ];
    }
    
    public function getSystemAllocationSummary()
    {
        $sql = "SELECT 
                COALESCE(SUM(total_allocated), 0) as total_allocated,
                COALESCE(SUM(total_spent), 0) as total_expenses,
                COALESCE(SUM(remaining_balance), 0) as allocation_balance
                FROM project_allocations";
        
        $summary = $this->db->queryOne($sql);
        
        if (!$summary) {
            return [
                'total_allocated' => '0.00',
                'total_expenses' => '0.00',
                'allocation_balance' => '0.00'
            ];
        }
        
        return [
            'total_allocated' => number_format((float)$summary['total_allocated'], 2, '.', ''),
            'total_expenses' => number_format((float)$summary['total_expenses'], 2, '.', ''),
            'allocation_balance' => number_format((float)$summary['allocation_balance'], 2, '.', '')
        ];
    }
    
    public function create($data, $files = [])
    {
        try {
            $this->db->beginTransaction();
            
            // Get current user to check role
            $currentUser = AuthMiddleware::user();
            
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
            
            $projectUser = $this->db->queryOne(
                "SELECT id FROM project_users WHERE project_id = ? AND user_id = ?",
                [$data['project_id'], $data['user_id']]
            );
            
            if (!$projectUser) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'User not assigned to this project'];
            }
            
            $amount = round((float)$data['amount'], 2);
            if ($amount <= 0) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Amount must be greater than zero'];
            }
            
            if (empty($data['category'])) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Expense type is required'];
            }
            
            $expenseType = $this->db->queryOne(
                "SELECT id FROM project_expense_types WHERE project_id = ? AND name = ?",
                [$data['project_id'], $data['category']]
            );
            
            if (!$expenseType) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Invalid expense type for this project'];
            }
            
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
            
            $receiptImage = $data['receipt_image'] ?? null;
            
            if (empty($receiptImage)) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Receipt image is required'];
            }
            
            // Determine status and approval based on user role
            $status = 'pending';
            $approvedBy = null;
            $approvedAt = null;
            
            if ($currentUser['role'] === 'super_admin') {
                $status = 'approved';
                $approvedBy = $currentUser['id'];
                $approvedAt = date('Y-m-d H:i:s');
            }
            
            $expenseId = Uuid::uuid4()->toString();
            $this->db->execute(
                "INSERT INTO expenses (id, project_id, user_id, amount, description, category, receipt_image, status, approved_by, approved_at, spent_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                [
                    $expenseId,
                    $data['project_id'],
                    $data['user_id'],
                    $amount,
                    $data['description'],
                    $data['category'],
                    $receiptImage,
                    $status,
                    $approvedBy,
                    $approvedAt
                ]
            );
            
            // If super_admin auto-approved, check if project should be completed
            if ($status === 'approved') {
                $updatedProjectBalance = $this->db->queryOne(
                    "SELECT * FROM project_allocations WHERE id = ?",
                    [$data['project_id']]
                );
                
                if ($updatedProjectBalance && 
                    (float)$updatedProjectBalance['remaining_balance'] <= 0 && 
                    (float)$updatedProjectBalance['total_spent'] > 0) {
                    $this->db->execute(
                        "UPDATE projects SET status = 'completed', updated_at = NOW() WHERE id = ? AND status = 'active'",
                        [$data['project_id']]
                    );
                }
            }
            
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
            
            $this->db->execute(
                "UPDATE expenses SET status = ?, approved_by = ?, approved_at = NOW() WHERE id = ?",
                ['approved', $approvedBy, $id]
            );
            
            $updatedProjectBalance = $this->db->queryOne(
                "SELECT * FROM project_allocations WHERE id = ?",
                [$expense['project_id']]
            );
            
            if ($updatedProjectBalance && 
                (float)$updatedProjectBalance['remaining_balance'] <= 0 && 
                (float)$updatedProjectBalance['total_spent'] > 0) {
                $this->db->execute(
                    "UPDATE projects SET status = 'completed', updated_at = NOW() WHERE id = ? AND status = 'active'",
                    [$expense['project_id']]
                );
            }
            
            $this->db->commit();
            
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