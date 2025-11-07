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
    
    public function getAll($filters = [], $page = 1, $perPage = 5)
    {
        $sql = "SELECT * FROM finances WHERE 1=1";
        $params = [];
        
        $countSql = "SELECT COUNT(*) as total FROM finances WHERE 1=1";
        $countParams = [];
        
        if (isset($filters['status'])) {
            $sql .= " AND status = ?";
            $params[] = $filters['status'];
            $countSql .= " AND status = ?";
            $countParams[] = $filters['status'];
        }
        
        $countResult = $this->db->queryOne($countSql, $countParams);
        $total = $countResult['total'] ?? 0;
        
        $sql .= " ORDER BY deposited_at DESC";
        $offset = ($page - 1) * $perPage;
        $sql .= " LIMIT " . (int)$perPage . " OFFSET " . (int)$offset;
        
        $data = $this->db->query($sql, $params);
        
        // Format amounts to 2 decimal places
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
        $sql = "SELECT * FROM finances WHERE id = ?";
        $finance = $this->db->queryOne($sql, [$id]);
        
        if ($finance) {
            $finance['amount'] = number_format((float)$finance['amount'], 2, '.', '');
        }
        
        return $finance;
    }
    
    public function create($data)
    {
        if (!is_numeric($data['amount']) || $data['amount'] <= 0) {
            return ['success' => false, 'message' => 'Invalid amount'];
        }
        
        // Round to 2 decimal places to prevent precision issues
        $amount = round((float)$data['amount'], 2);
        
        $financeId = Uuid::uuid4()->toString();
        $this->db->execute(
            "INSERT INTO finances (id, amount, description, deposited_by, status) 
             VALUES (?, ?, ?, ?, ?)",
            [
                $financeId,
                $amount,
                $data['description'] ?? null,
                $data['deposited_by'] ?? null,
                $data['status'] ?? 'approved'
            ]
        );
        
        $finance = $this->getById($financeId);
        return ['success' => true, 'data' => $finance];
    }
    
    public function update($id, $data)
    {
        $finance = $this->getById($id);
        if (!$finance) {
            return ['success' => false, 'message' => 'Finance record not found'];
        }
        
        if (isset($data['amount']) && (!is_numeric($data['amount']) || $data['amount'] <= 0)) {
            return ['success' => false, 'message' => 'Invalid amount'];
        }
        
        $updates = [];
        $params = [];
        
        if (isset($data['amount'])) {
            $updates[] = "amount = ?";
            $params[] = round((float)$data['amount'], 2);
        }
        
        if (isset($data['description'])) {
            $updates[] = "description = ?";
            $params[] = $data['description'];
        }
        
        if (isset($data['status'])) {
            $updates[] = "status = ?";
            $params[] = $data['status'];
        }
        
        if (empty($updates)) {
            return ['success' => false, 'message' => 'No fields to update'];
        }
        
        $params[] = $id;
        $sql = "UPDATE finances SET " . implode(', ', $updates) . " WHERE id = ?";
        $this->db->execute($sql, $params);
        
        $updatedFinance = $this->getById($id);
        return ['success' => true, 'data' => $updatedFinance];
    }
    
    public function delete($id)
    {
        $finance = $this->getById($id);
        if (!$finance) {
            return ['success' => false, 'message' => 'Finance record not found'];
        }
        
        $this->db->execute("DELETE FROM finances WHERE id = ?", [$id]);
        return ['success' => true, 'message' => 'Finance record deleted successfully'];
    }
    
    public function getTotalDeposits()
    {
        $result = $this->db->queryOne(
            "SELECT COALESCE(SUM(amount), 0) as total 
             FROM finances 
             WHERE status = 'approved' OR status IS NULL"
        );
        
        return number_format((float)($result['total'] ?? 0), 2, '.', '');
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
}