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
    
    public function getAll($filters = [], $page = 1, $perPage = 5)
    {
        $sql = "SELECT a.*, p.project_code, p.name as project_name, p.status as project_status,
                u.first_name as allocated_by_first_name, u.last_name as allocated_by_last_name
                FROM allocations a
                INNER JOIN projects p ON a.project_id = p.id
                LEFT JOIN users u ON a.allocated_by = u.id
                WHERE 1=1";
        $params = [];
        
        $countSql = "SELECT COUNT(*) as total FROM allocations a
                INNER JOIN projects p ON a.project_id = p.id
                WHERE 1=1";
        $countParams = [];
        
        if (isset($filters['project_id'])) {
            $sql .= " AND a.project_id = ?";
            $params[] = $filters['project_id'];
            $countSql .= " AND a.project_id = ?";
            $countParams[] = $filters['project_id'];
        }
        
        if (isset($filters['status'])) {
            $sql .= " AND a.status = ?";
            $params[] = $filters['status'];
            $countSql .= " AND a.status = ?";
            $countParams[] = $filters['status'];
        }
        
        $countResult = $this->db->queryOne($countSql, $countParams);
        $total = $countResult['total'] ?? 0;
        
        $sql .= " ORDER BY a.allocated_at DESC";
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
        $sql = "SELECT a.*, p.project_code, p.name as project_name, p.status as project_status,
                u.first_name as allocated_by_first_name, u.last_name as allocated_by_last_name
                FROM allocations a
                INNER JOIN projects p ON a.project_id = p.id
                LEFT JOIN users u ON a.allocated_by = u.id
                WHERE a.id = ?";
        
        $allocation = $this->db->queryOne($sql, [$id]);
        
        if ($allocation) {
            $allocation['amount'] = number_format((float)$allocation['amount'], 2, '.', '');
        }
        
        return $allocation;
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
            
            if ($project['status'] === 'closed' || $project['status'] === 'cancelled') {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Cannot allocate to closed or cancelled project'];
            }
            
            // Validate amount
            $amount = round((float)$data['amount'], 2);
            if ($amount <= 0) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Amount must be greater than zero'];
            }
            
            // Check system balance using system_balance view
            $systemBalance = $this->db->queryOne("SELECT * FROM system_balance");
            
            if (!$systemBalance) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Unable to retrieve system balance'];
            }
            
            $availableBalance = (float)$systemBalance['available_balance'];
            
            if ($availableBalance < $amount) {
                $this->db->rollback();
                return [
                    'success' => false, 
                    'message' => 'Insufficient system balance. Available: UGX ' . number_format($availableBalance, 2)
                ];
            }
            
            // Handle proof image upload
            $proofImage = null;
            if (isset($files['proof_image']) && $files['proof_image']['error'] === UPLOAD_ERR_OK) {
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
                "INSERT INTO allocations (id, project_id, amount, description, proof_image, allocated_by, status, allocated_at) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW())",
                [
                    $allocationId,
                    $data['project_id'],
                    $amount,
                    $data['description'] ?? null,
                    $proofImage,
                    $data['allocated_by'] ?? null,
                    $data['status'] ?? 'approved'
                ]
            );
            
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
            
            $allocation = $this->getById($id);
            if (!$allocation) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Allocation not found'];
            }
            
            $updateFields = [];
            $params = [];
            
            if (isset($data['amount'])) {
                $newAmount = round((float)$data['amount'], 2);
                if ($newAmount <= 0) {
                    $this->db->rollback();
                    return ['success' => false, 'message' => 'Amount must be greater than zero'];
                }
                
                // Calculate the difference in amount
                $currentAmount = (float)str_replace(',', '', $allocation['amount']);
                $amountDifference = $newAmount - $currentAmount;
                
                // If increasing, check if system has enough balance
                if ($amountDifference > 0) {
                    $systemBalance = $this->db->queryOne("SELECT * FROM system_balance");
                    
                    if (!$systemBalance) {
                        $this->db->rollback();
                        return ['success' => false, 'message' => 'Unable to retrieve system balance'];
                    }
                    
                    $availableBalance = (float)$systemBalance['available_balance'];
                    
                    if ($availableBalance < $amountDifference) {
                        $this->db->rollback();
                        return [
                            'success' => false, 
                            'message' => 'Insufficient system balance for increase. Available: UGX ' . number_format($availableBalance, 2)
                        ];
                    }
                }
                
                $updateFields[] = "amount = ?";
                $params[] = $newAmount;
            }
            
            if (isset($data['project_id'])) {
                // Validate new project
                $project = $this->db->queryOne(
                    "SELECT id, status FROM projects WHERE id = ? AND deleted_at IS NULL",
                    [$data['project_id']]
                );
                
                if (!$project) {
                    $this->db->rollback();
                    return ['success' => false, 'message' => 'Project not found'];
                }
                
                $updateFields[] = "project_id = ?";
                $params[] = $data['project_id'];
            }
            
            if (isset($data['description'])) {
                $updateFields[] = "description = ?";
                $params[] = $data['description'];
            }
            
            if (isset($data['status'])) {
                $validStatuses = ['pending', 'approved', 'rejected'];
                if (!in_array($data['status'], $validStatuses)) {
                    $this->db->rollback();
                    return ['success' => false, 'message' => 'Invalid status'];
                }
                $updateFields[] = "status = ?";
                $params[] = $data['status'];
            }
            
            if (isset($files['proof_image']) && $files['proof_image']['error'] === UPLOAD_ERR_OK) {
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
            
            $sql = "UPDATE allocations SET " . implode(", ", $updateFields) . ", updated_at = NOW() WHERE id = ?";
            $this->db->execute($sql, $params);
            
            $this->db->commit();
            
            $updatedAllocation = $this->getById($id);
            return ['success' => true, 'data' => $updatedAllocation];
            
        } catch (\Exception $e) {
            $this->db->rollback();
            return ['success' => false, 'message' => 'Failed to update allocation: ' . $e->getMessage()];
        }
    }
    
    public function delete($id)
    {
        try {
            $this->db->beginTransaction();
            
            $allocation = $this->getById($id);
            if (!$allocation) {
                $this->db->rollback();
                return ['success' => false, 'message' => 'Allocation not found'];
            }
            
            // Delete proof image if exists
            if ($allocation['proof_image']) {
                try {
                    $this->fileUploader->delete($allocation['proof_image']);
                } catch (\Exception $e) {
                    // Continue even if file deletion fails
                }
            }
            
            $this->db->execute("DELETE FROM allocations WHERE id = ?", [$id]);
            
            $this->db->commit();
            return ['success' => true, 'message' => 'Allocation deleted successfully'];
            
        } catch (\Exception $e) {
            $this->db->rollback();
            return ['success' => false, 'message' => 'Failed to delete allocation: ' . $e->getMessage()];
        }
    }
    
    public function getByProject($projectId, $page = 1, $perPage = 5)
    {
        return $this->getAll(['project_id' => $projectId], $page, $perPage);
    }
    
    public function getSystemBalance()
    {
        $balance = $this->db->queryOne("SELECT * FROM system_balance");
        
        if (!$balance) {
            return [
                'total_deposits' => '0.00',
                'total_allocated' => '0.00',
                'available_balance' => '0.00',
                'this_month_deposits' => '0.00'
            ];
        }
        
        return [
            'total_deposits' => number_format((float)$balance['total_deposits'], 2, '.', ''),
            'total_allocated' => number_format((float)$balance['total_allocated'], 2, '.', ''),
            'available_balance' => number_format((float)$balance['available_balance'], 2, '.', ''),
            'this_month_deposits' => number_format((float)$balance['this_month_deposits'], 2, '.', '')
        ];
    }
    
    public function getProjectAllocation($projectId)
    {
        $result = $this->db->queryOne(
            "SELECT 
                p.id,
                p.project_code,
                p.name as project_name,
                COALESCE(SUM(CASE WHEN a.status = 'approved' THEN a.amount ELSE 0 END), 0) as total_allocated,
                COALESCE((SELECT SUM(amount) FROM expenses WHERE project_id = p.id AND status = 'approved'), 0) as total_spent,
                COALESCE(SUM(CASE WHEN a.status = 'approved' THEN a.amount ELSE 0 END), 0) - 
                COALESCE((SELECT SUM(amount) FROM expenses WHERE project_id = p.id AND status = 'approved'), 0) as remaining_balance
            FROM projects p
            LEFT JOIN allocations a ON p.id = a.project_id
            WHERE p.id = ? AND p.deleted_at IS NULL
            GROUP BY p.id, p.project_code, p.name",
            [$projectId]
        );
        
        if (!$result) {
            return [
                'total_allocated' => '0.00',
                'total_spent' => '0.00',
                'remaining_balance' => '0.00'
            ];
        }
        
        return [
            'id' => $result['id'],
            'project_code' => $result['project_code'],
            'project_name' => $result['project_name'],
            'total_allocated' => number_format((float)$result['total_allocated'], 2, '.', ''),
            'total_spent' => number_format((float)$result['total_spent'], 2, '.', ''),
            'remaining_balance' => number_format((float)$result['remaining_balance'], 2, '.', '')
        ];
    }
}