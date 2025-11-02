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
            
            // Check project balance using the view
            $balance = $this->db->queryOne(
                "SELECT * FROM project_balances WHERE id = ?",
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
            
            // Insert allocation - this will automatically update the view
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
            
            // Check if user has existing allocations for this project (using the actual allocations table)
            $existingAllocation = $this->db->queryOne(
                "SELECT id FROM allocations 
                 WHERE user_id = ? AND project_id = ? AND status = 'approved'",
                [$data['user_id'], $data['project_id']]
            );
            
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
                
                // If amount is being changed, we need to check balance
                $amountDifference = $data['amount'] - $allocation['amount'];
                
                if ($amountDifference != 0) {
                    // Check if there's enough unallocated balance for increase
                    if ($amountDifference > 0) {
                        $balance = $this->db->queryOne(
                            "SELECT unallocated_balance FROM project_balances WHERE id = ?",
                            [$allocation['project_id']]
                        );
                        
                        if ($balance['unallocated_balance'] < $amountDifference) {
                            $this->db->rollback();
                            return ['success' => false, 'message' => 'Insufficient project balance for amount increase'];
                        }
                    }
                    
                    // Just update the allocation amount - the view will recalculate automatically
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