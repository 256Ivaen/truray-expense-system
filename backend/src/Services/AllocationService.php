<?php

namespace App\Services;

use App\Models\Allocation;
use App\Utils\Database;
use App\Utils\FileUploader;
use Ramsey\Uuid\Uuid;

class AllocationService
{
    private $allocationModel;
    private $db;
    private $fileUploader;
    
    public function __construct()
    {
        $this->allocationModel = new Allocation();
        $this->db = Database::getInstance();
        $this->fileUploader = new FileUploader();
    }
    
    public function getAll($filters = [])
    {
        $sql = "SELECT a.*, p.project_code, p.name as project_name, 
                u.first_name, u.last_name, u.email
                FROM allocations a
                INNER JOIN projects p ON a.project_id = p.id
                INNER JOIN users u ON a.user_id = u.id
                WHERE 1=1";
        $params = [];
        
        if (isset($filters['project_id'])) {
            $sql .= " AND a.project_id = ?";
            $params[] = $filters['project_id'];
        }
        
        if (isset($filters['user_id'])) {
            $sql .= " AND a.user_id = ?";
            $params[] = $filters['user_id'];
        }
        
        if (isset($filters['status'])) {
            $sql .= " AND a.status = ?";
            $params[] = $filters['status'];
        }
        
        $sql .= " ORDER BY a.allocated_at DESC";
        
        return $this->db->query($sql, $params);
    }
    
    public function getById($id)
    {
        $sql = "SELECT a.*, p.project_code, p.name as project_name,
                u.first_name, u.last_name, u.email
                FROM allocations a
                INNER JOIN projects p ON a.project_id = p.id
                INNER JOIN users u ON a.user_id = u.id
                WHERE a.id = ?";
        
        return $this->db->queryOne($sql, [$id]);
    }
    
    public function create($data, $files = [])
    {
        try {
            $this->db->beginTransaction();
            
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
                return ['success' => false, 'message' => 'Cannot allocate to closed, cancelled or completed project'];
            }
            
            $user = $this->db->queryOne(
                "SELECT id FROM users WHERE id = ? AND deleted_at IS NULL",
                [$data['user_id']]
            );
            
            if (!$user) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'User not found'];
            }
            
            $projectUser = $this->db->queryOne(
                "SELECT id FROM project_users WHERE project_id = ? AND user_id = ?",
                [$data['project_id'], $data['user_id']]
            );
            
            if (!$projectUser) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'User not assigned to this project'];
            }
            
            if (!is_numeric($data['amount']) || $data['amount'] <= 0) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Invalid amount'];
            }
            
            // Get current project balance with FOR UPDATE to lock the row
            $balance = $this->db->queryOne(
                "SELECT * FROM project_balances WHERE id = ? FOR UPDATE",
                [$data['project_id']]
            );
            
            if (!$balance) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Project balance not found'];
            }
            
            if ($balance['unallocated_balance'] < $data['amount']) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Insufficient project balance'];
            }
            
            $proofImage = null;
            if (isset($files['proof_image'])) {
                try {
                    $proofImage = $this->fileUploader->upload($files['proof_image'], 'allocations');
                } catch (\Exception $e) {
                    $this->db->rollback();
                    return ['success' => false, 'message' => 'Failed to upload proof image: ' . $e->getMessage()];
                }
            }
            
            $allocationId = Uuid::uuid4()->toString();
            
            // Insert allocation
            $this->db->execute(
                "INSERT INTO allocations (id, project_id, user_id, amount, description, proof_image, allocated_by, status) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    $allocationId,
                    $data['project_id'],
                    $data['user_id'],
                    $data['amount'],
                    $data['description'] ?? null,
                    $proofImage,
                    $data['allocated_by'] ?? null,
                    $data['status'] ?? 'approved'
                ]
            );
            
            // Update project balance - deduct from unallocated, add to allocated (without updated_at)
            $this->db->execute(
                "UPDATE project_balances 
                 SET unallocated_balance = unallocated_balance - ?,
                     allocated_balance = allocated_balance + ?
                 WHERE id = ?",
                [$data['amount'], $data['amount'], $data['project_id']]
            );
            
            // Update or create user allocation balance
            $userBalance = $this->db->queryOne(
                "SELECT id FROM user_allocation_balances 
                 WHERE user_id = ? AND project_id = ?",
                [$data['user_id'], $data['project_id']]
            );
            
            if ($userBalance) {
                // Update existing balance (without updated_at)
                $this->db->execute(
                    "UPDATE user_allocation_balances 
                     SET total_allocated = total_allocated + ?,
                         remaining_balance = remaining_balance + ?
                     WHERE user_id = ? AND project_id = ?",
                    [$data['amount'], $data['amount'], $data['user_id'], $data['project_id']]
                );
            } else {
                // Create new balance record
                $this->db->execute(
                    "INSERT INTO user_allocation_balances (user_id, project_id, total_allocated, total_spent, remaining_balance)
                     VALUES (?, ?, ?, 0, ?)",
                    [$data['user_id'], $data['project_id'], $data['amount'], $data['amount']]
                );
            }
            
            // If project was completed but now has new allocations, reopen it
            if ($project['status'] === 'completed') {
                $this->db->execute(
                    "UPDATE projects SET status = 'active', updated_at = NOW() WHERE id = ?",
                    [$data['project_id']]
                );
            }
            
            $this->db->commit();
            
            $allocation = $this->getById($allocationId);
            return ['success' => true, 'data' => $allocation];
            
        } catch (\Exception $e) {
            $this->db->rollback();
            return ['success' => false, 'message' => 'Failed to create allocation: ' . $e->getMessage()];
        }
    }
    
    public function update($id, $data, $files = [])
    {
        try {
            $this->db->beginTransaction();
            
            $allocation = $this->allocationModel->find($id);
            if (!$allocation) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Allocation not found'];
            }
            
            $updateFields = [];
            $params = [];
            
            if (isset($data['amount'])) {
                if (!is_numeric($data['amount']) || $data['amount'] <= 0) {
                    $this->db->rollback();
                    return ['success' => false, 'message' => 'Invalid amount'];
                }
                
                // If amount is being changed, we need to adjust balances
                $amountDifference = $data['amount'] - $allocation['amount'];
                
                if ($amountDifference != 0) {
                    // Check if there's enough unallocated balance for increase
                    if ($amountDifference > 0) {
                        $balance = $this->db->queryOne(
                            "SELECT unallocated_balance FROM project_balances WHERE id = ? FOR UPDATE",
                            [$allocation['project_id']]
                        );
                        
                        if ($balance['unallocated_balance'] < $amountDifference) {
                            $this->db->rollback();
                            return ['success' => false, 'message' => 'Insufficient project balance for amount increase'];
                        }
                    }
                    
                    // Update project balance (without updated_at)
                    $this->db->execute(
                        "UPDATE project_balances 
                         SET unallocated_balance = unallocated_balance - ?,
                             allocated_balance = allocated_balance + ?
                         WHERE id = ?",
                        [$amountDifference, $amountDifference, $allocation['project_id']]
                    );
                    
                    // Update user allocation balance (without updated_at)
                    $this->db->execute(
                        "UPDATE user_allocation_balances 
                         SET total_allocated = total_allocated + ?,
                             remaining_balance = remaining_balance + ?
                         WHERE user_id = ? AND project_id = ?",
                        [$amountDifference, $amountDifference, $allocation['user_id'], $allocation['project_id']]
                    );
                }
                
                $updateFields[] = "amount = ?";
                $params[] = $data['amount'];
            }
            
            if (isset($data['description'])) {
                $updateFields[] = "description = ?";
                $params[] = $data['description'];
            }
            
            if (isset($data['status'])) {
                $updateFields[] = "status = ?";
                $params[] = $data['status'];
            }
            
            if (isset($files['proof_image'])) {
                try {
                    if ($allocation['proof_image']) {
                        $this->fileUploader->delete($allocation['proof_image']);
                    }
                    $proofImage = $this->fileUploader->upload($files['proof_image'], 'allocations');
                    $updateFields[] = "proof_image = ?";
                    $params[] = $proofImage;
                } catch (\Exception $e) {
                    $this->db->rollback();
                    return ['success' => false, 'message' => 'Failed to upload proof image: ' . $e->getMessage()];
                }
            }
            
            if (empty($updateFields)) {
                $this->db->commit();
                return ['success' => true, 'data' => $allocation];
            }
            
            $params[] = $id;
            
            $sql = "UPDATE allocations SET " . implode(", ", $updateFields) . " WHERE id = ?";
            $this->db->execute($sql, $params);
            
            $this->db->commit();
            
            $updatedAllocation = $this->getById($id);
            return ['success' => true, 'data' => $updatedAllocation];
            
        } catch (\Exception $e) {
            $this->db->rollback();
            return ['success' => false, 'message' => 'Failed to update allocation: ' . $e->getMessage()];
        }
    }
    
    public function getByUser($userId)
    {
        return $this->getAll(['user_id' => $userId]);
    }
    
    public function getByProject($projectId)
    {
        return $this->getAll(['project_id' => $projectId]);
    }
    
    public function getUserBalance($userId, $projectId)
    {
        $result = $this->db->queryOne(
            "SELECT * FROM user_allocation_balances 
             WHERE user_id = ? AND project_id = ?",
            [$userId, $projectId]
        );
        
        return $result ?? [
            'total_allocated' => 0,
            'total_spent' => 0,
            'remaining_balance' => 0
        ];
    }
}