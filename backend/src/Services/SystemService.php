<?php

namespace App\Services;

use App\Utils\Database;

class SystemService
{
    private $db;
    
    public function __construct()
    {
        $this->db = Database::getInstance();
    }
    
    public function getRateLimits($filters = [], $page = 1, $perPage = 20)
    {
        $sql = "SELECT 
                    rl.id,
                    rl.identifier,
                    rl.created_at,
                    SUBSTRING_INDEX(rl.identifier, ':', 1) as ip_address,
                    CASE 
                        WHEN LOCATE(':', rl.identifier) > 0 THEN SUBSTRING_INDEX(rl.identifier, ':', -1)
                        ELSE NULL 
                    END as user_id,
                    CASE 
                        WHEN rl.identifier LIKE 'login:%' THEN 'login'
                        WHEN rl.identifier LIKE 'api:%' THEN 'api'
                        WHEN rl.identifier LIKE 'upload:%' THEN 'upload'
                        ELSE 'other'
                    END as type
                FROM rate_limits rl
                WHERE 1=1";
        
        $countSql = "SELECT COUNT(*) as total FROM rate_limits rl WHERE 1=1";
        $params = [];
        $countParams = [];
        
        // Apply filters
        if (isset($filters['type'])) {
            $sql .= " AND rl.identifier LIKE ?";
            $countSql .= " AND rl.identifier LIKE ?";
            $params[] = $filters['type'] . '%';
            $countParams[] = $filters['type'] . '%';
        }
        
        if (isset($filters['ip_address'])) {
            $sql .= " AND rl.identifier LIKE ?";
            $countSql .= " AND rl.identifier LIKE ?";
            $params[] = $filters['ip_address'] . '%';
            $countParams[] = $filters['ip_address'] . '%';
        }
        
        if (isset($filters['date_from'])) {
            $sql .= " AND DATE(rl.created_at) >= ?";
            $countSql .= " AND DATE(rl.created_at) >= ?";
            $params[] = $filters['date_from'];
            $countParams[] = $filters['date_from'];
        }
        
        if (isset($filters['date_to'])) {
            $sql .= " AND DATE(rl.created_at) <= ?";
            $countSql .= " AND DATE(rl.created_at) <= ?";
            $params[] = $filters['date_to'];
            $countParams[] = $filters['date_to'];
        }
        
        // Get total count
        $countResult = $this->db->queryOne($countSql, $countParams);
        $total = $countResult['total'] ?? 0;
        
        // Apply sorting and pagination
        $sql .= " ORDER BY rl.created_at DESC";
        $offset = ($page - 1) * $perPage;
        $sql .= " LIMIT " . (int)$perPage . " OFFSET " . (int)$offset;
        
        $data = $this->db->query($sql, $params);
        
        // Enrich with user details
        foreach ($data as &$record) {
            if ($record['user_id']) {
                $user = $this->db->queryOne(
                    "SELECT email, first_name, last_name FROM users WHERE id = ? AND deleted_at IS NULL",
                    [$record['user_id']]
                );
                if ($user) {
                    $record['user_email'] = $user['email'];
                    $record['user_name'] = $user['first_name'] . ' ' . $user['last_name'];
                }
            }
        }
        
        return [
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => ceil($total / $perPage)
        ];
    }
    
    public function getSystemSeasons($page = 1, $perPage = 20)
    {
        // If you have a seasons table, implement this
        // For now, returning empty with structure
        return [
            'data' => [],
            'total' => 0,
            'page' => $page,
            'per_page' => $perPage,
            'message' => 'Seasons functionality to be implemented'
        ];
    }
    
    public function getSystemMetrics()
    {
        // Total users
        $usersSql = "SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL";
        $usersResult = $this->db->queryOne($usersSql);
        
        // Total projects
        $projectsSql = "SELECT COUNT(*) as total FROM projects WHERE deleted_at IS NULL";
        $projectsResult = $this->db->queryOne($projectsSql);
        
        // Total allocations
        $allocationsSql = "SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount FROM allocations";
        $allocationsResult = $this->db->queryOne($allocationsSql);
        
        // Total expenses
        $expensesSql = "SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount FROM expenses";
        $expensesResult = $this->db->queryOne($expensesSql);
        
        // Recent audit activity
        $recentAuditSql = "SELECT COUNT(*) as total FROM audit_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)";
        $recentAuditResult = $this->db->queryOne($recentAuditSql);
        
        // Rate limit hits today
        $rateLimitsSql = "SELECT COUNT(*) as total FROM rate_limits WHERE created_at >= CURDATE()";
        $rateLimitsResult = $this->db->queryOne($rateLimitsSql);
        
        // System balance
        $balanceSql = "SELECT * FROM system_balance LIMIT 1";
        $balanceResult = $this->db->queryOne($balanceSql);
        
        return [
            'users' => [
                'total' => $usersResult['total'] ?? 0
            ],
            'projects' => [
                'total' => $projectsResult['total'] ?? 0
            ],
            'allocations' => [
                'total' => $allocationsResult['total'] ?? 0,
                'total_amount' => number_format((float)($allocationsResult['total_amount'] ?? 0), 2, '.', '')
            ],
            'expenses' => [
                'total' => $expensesResult['total'] ?? 0,
                'total_amount' => number_format((float)($expensesResult['total_amount'] ?? 0), 2, '.', '')
            ],
            'audit' => [
                'last_24h' => $recentAuditResult['total'] ?? 0
            ],
            'rate_limits' => [
                'today' => $rateLimitsResult['total'] ?? 0
            ],
            'system_balance' => $balanceResult ? [
                'total_deposits' => number_format((float)($balanceResult['total_deposits'] ?? 0), 2, '.', ''),
                'total_allocated' => number_format((float)($balanceResult['total_allocated'] ?? 0), 2, '.', ''),
                'available_balance' => number_format((float)($balanceResult['available_balance'] ?? 0), 2, '.', '')
            ] : null,
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }
}