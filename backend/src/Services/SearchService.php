<?php

namespace App\Services;

use App\Utils\Database;

class SearchService
{
    private $db;
    
    public function __construct()
    {
        $this->db = Database::getInstance();
    }
    
    public function search($query, $type, $userRole, $userId, $page = 1, $perPage = 10)
    {
        $searchTerm = '%' . $query . '%';
        $offset = ($page - 1) * $perPage;
        
        switch ($type) {
            case 'projects':
                return $this->searchProjects($searchTerm, $userRole, $userId, $page, $perPage, $offset);
            case 'allocations':
                return $this->searchAllocations($searchTerm, $userRole, $userId, $page, $perPage, $offset);
            case 'expenses':
                return $this->searchExpenses($searchTerm, $userRole, $userId, $page, $perPage, $offset);
            case 'users':
                return $this->searchUsers($searchTerm, $page, $perPage, $offset);
            case 'finance':
                return $this->searchFinances($searchTerm, $userRole, $page, $perPage, $offset);
            case 'all':
            default:
                return $this->searchAll($searchTerm, $userRole, $userId, $page, $perPage, $offset);
        }
    }
    
    private function searchProjects($searchTerm, $userRole, $userId, $page, $perPage, $offset)
    {
        $sql = "SELECT 'project' as type, p.id, p.project_code as code, p.name as title, 
                p.description, p.status, p.created_at, NULL as amount,
                CONCAT('Project: ', p.name) as display_text
                FROM projects p WHERE p.deleted_at IS NULL 
                AND (p.project_code LIKE ? OR p.name LIKE ? OR p.description LIKE ?)";
        
        $params = [$searchTerm, $searchTerm, $searchTerm];
        
        if ($userRole === 'user') {
            $sql .= " AND p.id IN (SELECT project_id FROM project_users WHERE user_id = ?)";
            $params[] = $userId;
        }
        
        return $this->executeSearch($sql, $params, $page, $perPage, $offset);
    }
    
    private function searchAllocations($searchTerm, $userRole, $userId, $page, $perPage, $offset)
    {
        $sql = "SELECT 'allocation' as type, a.id, p.project_code as code, 
                CONCAT('Allocation for ', p.name) as title, a.description, a.status, 
                a.allocated_at as created_at, a.amount,
                CONCAT('Allocation of UGX ', FORMAT(a.amount, 2), ' for ', p.name) as display_text,
                CONCAT(u.first_name, ' ', u.last_name) as allocated_by_name
                FROM allocations a
                INNER JOIN projects p ON a.project_id = p.id
                LEFT JOIN users u ON a.allocated_by = u.id
                WHERE p.deleted_at IS NULL
                AND (p.project_code LIKE ? OR p.name LIKE ? OR a.description LIKE ? 
                     OR u.first_name LIKE ? OR u.last_name LIKE ?)";
        
        $params = [$searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm];
        
        if ($userRole === 'user') {
            $sql .= " AND p.id IN (SELECT project_id FROM project_users WHERE user_id = ?)";
            $params[] = $userId;
        }
        
        return $this->executeSearch($sql, $params, $page, $perPage, $offset);
    }
    
    private function searchExpenses($searchTerm, $userRole, $userId, $page, $perPage, $offset)
    {
        $sql = "SELECT 'expense' as type, e.id, p.project_code as code, 
                CONCAT('Expense for ', p.name) as title, e.description, e.status, 
                e.spent_at as created_at, e.amount,
                CONCAT('Expense of UGX ', FORMAT(e.amount, 2), ' for ', p.name) as display_text,
                CONCAT(u.first_name, ' ', u.last_name) as submitted_by_name,
                CONCAT(approver.first_name, ' ', approver.last_name) as approved_by_name
                FROM expenses e
                INNER JOIN projects p ON e.project_id = p.id
                INNER JOIN users u ON e.user_id = u.id
                LEFT JOIN users approver ON e.approved_by = approver.id
                WHERE p.deleted_at IS NULL
                AND (p.project_code LIKE ? OR p.name LIKE ? OR e.description LIKE ? OR e.category LIKE ?
                     OR u.first_name LIKE ? OR u.last_name LIKE ? 
                     OR approver.first_name LIKE ? OR approver.last_name LIKE ?)";
        
        $params = [$searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm];
        
        if ($userRole === 'user') {
            $sql .= " AND e.user_id = ?";
            $params[] = $userId;
        }
        
        return $this->executeSearch($sql, $params, $page, $perPage, $offset);
    }
    
    private function searchUsers($searchTerm, $page, $perPage, $offset)
    {
        $sql = "SELECT 'user' as type, id, email as code, 
                CONCAT(first_name, ' ', last_name) as title, role as description, 
                status, created_at, NULL as amount,
                CONCAT(first_name, ' ', last_name, ' (', email, ') - ', role) as display_text
                FROM users WHERE deleted_at IS NULL 
                AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR role LIKE ?)";
        
        $params = [$searchTerm, $searchTerm, $searchTerm, $searchTerm];
        
        return $this->executeSearch($sql, $params, $page, $perPage, $offset);
    }
    
    private function searchFinances($searchTerm, $userRole, $page, $perPage, $offset)
    {
        if ($userRole !== 'admin') {
            return ['data' => [], 'total' => 0, 'page' => $page, 'per_page' => $perPage];
        }
        
        $sql = "SELECT 'finance' as type, id, 'FINANCE' as code, 
                CONCAT('Deposit of UGX ', FORMAT(amount, 2)) as title, description, 
                status, deposited_at as created_at, amount,
                CONCAT('Deposit of UGX ', FORMAT(amount, 2)) as display_text,
                CONCAT(depositor.first_name, ' ', depositor.last_name) as deposited_by_name
                FROM finances f
                LEFT JOIN users depositor ON f.deposited_by = depositor.id
                WHERE (f.description LIKE ? OR depositor.first_name LIKE ? OR depositor.last_name LIKE ?)";
        
        $params = [$searchTerm, $searchTerm, $searchTerm];
        
        return $this->executeSearch($sql, $params, $page, $perPage, $offset);
    }
    
    private function searchAll($searchTerm, $userRole, $userId, $page, $perPage, $offset)
    {
        $allResults = [];
        
        $projects = $this->searchProjects($searchTerm, $userRole, $userId, 1, 5, 0);
        $allResults = array_merge($allResults, $projects['data']);
        
        $allocations = $this->searchAllocations($searchTerm, $userRole, $userId, 1, 5, 0);
        $allResults = array_merge($allResults, $allocations['data']);
        
        $expenses = $this->searchExpenses($searchTerm, $userRole, $userId, 1, 5, 0);
        $allResults = array_merge($allResults, $expenses['data']);
        
        if ($userRole === 'admin') {
            $finances = $this->searchFinances($searchTerm, $userRole, 1, 5, 0);
            $allResults = array_merge($allResults, $finances['data']);
            
            $users = $this->searchUsers($searchTerm, 1, 5, 0);
            $allResults = array_merge($allResults, $users['data']);
        }
        
        $total = count($allResults);
        $paginatedResults = array_slice($allResults, $offset, $perPage);
        
        return [
            'data' => $paginatedResults,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'has_more' => count($allResults) > ($offset + $perPage)
        ];
    }
    
    private function executeSearch($sql, $params, $page, $perPage, $offset)
    {
        $countSql = "SELECT COUNT(*) as total FROM ($sql) as subquery";
        $countResult = $this->db->queryOne($countSql, $params);
        $total = $countResult['total'] ?? 0;
        
        $dataSql = $sql . " ORDER BY created_at DESC LIMIT " . (int)$perPage . " OFFSET " . (int)$offset;
        $data = $this->db->query($dataSql, $params);
        
        foreach ($data as &$record) {
            if ($record['amount'] !== null) {
                $record['amount'] = number_format((float)$record['amount'], 2, '.', '');
            }
        }
        
        return [
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage
        ];
    }
}