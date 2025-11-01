<?php

namespace App\Services;

use App\Models\Finance;
use App\Utils\Database;
use Ramsey\Uuid\Uuid;

class FinanceService
{
    private $financeModel;
    private $db;
    
    public function __construct()
    {
        $this->financeModel = new Finance();
        $this->db = Database::getInstance();
    }
    
    public function getAll($filters = [])
    {
        $sql = "SELECT f.*, p.project_code, p.name as project_name 
                FROM finances f
                INNER JOIN projects p ON f.project_id = p.id
                WHERE 1=1";
        $params = [];
        
        if (isset($filters['project_id'])) {
            $sql .= " AND f.project_id = ?";
            $params[] = $filters['project_id'];
        }
        
        if (isset($filters['status'])) {
            $sql .= " AND f.status = ?";
            $params[] = $filters['status'];
        }
        
        $sql .= " ORDER BY f.deposited_at DESC";
        
        return $this->db->query($sql, $params);
    }
    
    public function getById($id)
    {
        $sql = "SELECT f.*, p.project_code, p.name as project_name 
                FROM finances f
                INNER JOIN projects p ON f.project_id = p.id
                WHERE f.id = ?";
        
        return $this->db->queryOne($sql, [$id]);
    }
    
    public function create($data)
    {
        $project = $this->db->queryOne(
            "SELECT id, status FROM projects WHERE id = ? AND deleted_at IS NULL",
            [$data['project_id']]
        );
        
        if (!$project) {
            return ['success' => false, 'message' => 'Project not found'];
        }
        
        if ($project['status'] === 'closed' || $project['status'] === 'cancelled') {
            return ['success' => false, 'message' => 'Cannot deposit to closed or cancelled project'];
        }
        
        if (!is_numeric($data['amount']) || $data['amount'] <= 0) {
            return ['success' => false, 'message' => 'Invalid amount'];
        }
        
        $financeId = Uuid::uuid4()->toString();
        $this->db->execute(
            "INSERT INTO finances (id, project_id, amount, description, deposited_by, status) 
             VALUES (?, ?, ?, ?, ?, ?)",
            [
                $financeId,
                $data['project_id'],
                $data['amount'],
                $data['description'] ?? null,
                $data['deposited_by'] ?? null,
                $data['status'] ?? 'approved'
            ]
        );
        
        $finance = $this->getById($financeId);
        return ['success' => true, 'data' => $finance];
    }
    
    public function getByProject($projectId)
    {
        return $this->getAll(['project_id' => $projectId]);
    }
    
    public function getTotalDeposits($projectId)
    {
        $result = $this->db->queryOne(
            "SELECT COALESCE(SUM(amount), 0) as total 
             FROM finances 
             WHERE project_id = ? AND status = 'approved'",
            [$projectId]
        );
        
        return $result['total'] ?? 0;
    }
}