<?php

namespace App\Services;

use App\Utils\Database;
use App\Utils\Logger;

class AuditService
{
    private $db;
    
    public function __construct()
    {
        $this->db = Database::getInstance();
    }
    
    public function getAuditLogs($filters = [], $page = 1, $perPage = 20)
    {
        $sql = "SELECT 
                    al.id,
                    al.user_id,
                    al.action,
                    al.table_name,
                    al.record_id,
                    al.old_values,
                    al.new_values,
                    al.ip_address,
                    al.user_agent,
                    al.created_at,
                    u.email as user_email,
                    CONCAT(u.first_name, ' ', u.last_name) as user_name
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE 1=1";
        
        $countSql = "SELECT COUNT(*) as total FROM audit_logs al WHERE 1=1";
        $params = [];
        $countParams = [];
        
        // Apply filters
        if (isset($filters['action'])) {
            $sql .= " AND al.action LIKE ?";
            $countSql .= " AND al.action LIKE ?";
            $params[] = $filters['action'] . '%';
            $countParams[] = $filters['action'] . '%';
        }
        
        if (isset($filters['table_name'])) {
            $sql .= " AND al.table_name = ?";
            $countSql .= " AND al.table_name = ?";
            $params[] = $filters['table_name'];
            $countParams[] = $filters['table_name'];
        }
        
        if (isset($filters['user_id'])) {
            $sql .= " AND al.user_id = ?";
            $countSql .= " AND al.user_id = ?";
            $params[] = $filters['user_id'];
            $countParams[] = $filters['user_id'];
        }
        
        if (isset($filters['date_from'])) {
            $sql .= " AND DATE(al.created_at) >= ?";
            $countSql .= " AND DATE(al.created_at) >= ?";
            $params[] = $filters['date_from'];
            $countParams[] = $filters['date_from'];
        }
        
        if (isset($filters['date_to'])) {
            $sql .= " AND DATE(al.created_at) <= ?";
            $countSql .= " AND DATE(al.created_at) <= ?";
            $params[] = $filters['date_to'];
            $countParams[] = $filters['date_to'];
        }
        
        if (isset($filters['ip_address'])) {
            $sql .= " AND al.ip_address LIKE ?";
            $countSql .= " AND al.ip_address LIKE ?";
            $params[] = $filters['ip_address'] . '%';
            $countParams[] = $filters['ip_address'] . '%';
        }
        
        // Get total count
        $countResult = $this->db->queryOne($countSql, $countParams);
        $total = $countResult['total'] ?? 0;
        
        // Apply sorting and pagination
        $sql .= " ORDER BY al.created_at DESC";
        $offset = ($page - 1) * $perPage;
        $sql .= " LIMIT " . (int)$perPage . " OFFSET " . (int)$offset;
        
        $data = $this->db->query($sql, $params);
        
        // Process data
        foreach ($data as &$record) {
            $record = $this->enrichAuditRecord($record);
        }
        
        return [
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => ceil($total / $perPage)
        ];
    }
    
    public function getAuditDetails($auditId)
    {
        $sql = "SELECT 
                    al.*,
                    u.email as user_email,
                    CONCAT(u.first_name, ' ', u.last_name) as user_name,
                    u.role as user_role
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE al.id = ?";
        
        $audit = $this->db->queryOne($sql, [$auditId]);
        
        if (!$audit) {
            return null;
        }
        
        return $this->enrichAuditRecord($audit, true);
    }
    
    public function searchAudit($query, $type = 'all', $page = 1, $perPage = 20)
    {
        $searchTerm = '%' . $query . '%';
        $offset = ($page - 1) * $perPage;
        
        // Use LIKE for search since FULLTEXT might not be available
        $sql = "SELECT 
                    al.id,
                    al.user_id,
                    al.action,
                    al.table_name,
                    al.record_id,
                    al.old_values,
                    al.new_values,
                    al.ip_address,
                    al.user_agent,
                    al.created_at,
                    u.email as user_email,
                    CONCAT(u.first_name, ' ', u.last_name) as user_name
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                WHERE (al.action LIKE ? OR al.table_name LIKE ? OR al.old_values LIKE ? OR al.new_values LIKE ?
                   OR u.email LIKE ? OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?)
                ORDER BY al.created_at DESC
                LIMIT " . (int)$perPage . " OFFSET " . (int)$offset;
        
        $countSql = "SELECT COUNT(*) as total 
                     FROM audit_logs al
                     LEFT JOIN users u ON al.user_id = u.id
                     WHERE (al.action LIKE ? OR al.table_name LIKE ? OR al.old_values LIKE ? OR al.new_values LIKE ?
                        OR u.email LIKE ? OR CONCAT(u.first_name, ' ', u.last_name) LIKE ?)";
        
        $params = [$searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm];
        $countParams = [$searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm, $searchTerm];
        
        $countResult = $this->db->queryOne($countSql, $countParams);
        $total = $countResult['total'] ?? 0;
        
        $data = $this->db->query($sql, $params);
        
        foreach ($data as &$record) {
            $record = $this->enrichAuditRecord($record);
        }
        
        return [
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'query' => $query,
            'type' => $type
        ];
    }
    
    public function getAuditStatistics($period = '30d')
    {
        $dateCondition = $this->getDateCondition($period);
        
        // Total actions
        $totalSql = "SELECT COUNT(*) as total FROM audit_logs WHERE $dateCondition";
        $totalResult = $this->db->queryOne($totalSql);
        
        // Actions by type
        $actionsSql = "SELECT action, COUNT(*) as count 
                      FROM audit_logs 
                      WHERE $dateCondition 
                      GROUP BY action 
                      ORDER BY count DESC 
                      LIMIT 10";
        $actions = $this->db->query($actionsSql);
        
        // Actions by table
        $tablesSql = "SELECT table_name, COUNT(*) as count 
                     FROM audit_logs 
                     WHERE $dateCondition AND table_name IS NOT NULL 
                     GROUP BY table_name 
                     ORDER BY count DESC";
        $tables = $this->db->query($tablesSql);
        
        // Actions by user
        $usersSql = "SELECT u.id, u.email, CONCAT(u.first_name, ' ', u.last_name) as name, 
                            COUNT(al.id) as action_count
                     FROM audit_logs al
                     LEFT JOIN users u ON al.user_id = u.id
                     WHERE $dateCondition 
                     GROUP BY u.id, u.email, u.first_name, u.last_name
                     ORDER BY action_count DESC 
                     LIMIT 10";
        $users = $this->db->query($usersSql);
        
        // Daily activity
        $dailySql = "SELECT DATE(created_at) as date, COUNT(*) as count 
                    FROM audit_logs 
                    WHERE $dateCondition 
                    GROUP BY DATE(created_at) 
                    ORDER BY date DESC 
                    LIMIT 30";
        $daily = $this->db->query($dailySql);
        
        return [
            'total_actions' => $totalResult['total'] ?? 0,
            'top_actions' => $actions,
            'top_tables' => $tables,
            'top_users' => $users,
            'daily_activity' => array_reverse($daily), // Reverse to show chronological order
            'period' => $period
        ];
    }
    
    private function enrichAuditRecord($record, $fullDetails = false)
    {
        // Parse JSON values
        if ($record['old_values']) {
            $record['old_values_parsed'] = json_decode($record['old_values'], true);
        }
        
        if ($record['new_values']) {
            $record['new_values_parsed'] = json_decode($record['new_values'], true);
        }
        
        // Add record details if available
        if ($record['table_name'] && $record['record_id']) {
            $record['record_details'] = $this->getRecordDetails($record['table_name'], $record['record_id']);
        }
        
        // Add action category
        $record['action_category'] = $this->categorizeAction($record['action']);
        
        // Add human-readable description
        $record['description'] = $this->generateDescription($record);
        
        if ($fullDetails) {
            // Add additional details for full view
            $record['user_agent_parsed'] = $this->parseUserAgent($record['user_agent']);
            $record['location'] = $this->getLocationFromIP($record['ip_address']);
        }
        
        return $record;
    }
    
    private function getRecordDetails($tableName, $recordId)
    {
        try {
            switch ($tableName) {
                case 'users':
                    $sql = "SELECT id, email, first_name, last_name, role, status FROM users WHERE id = ? AND deleted_at IS NULL";
                    break;
                case 'projects':
                    $sql = "SELECT id, project_code, name, status FROM projects WHERE id = ? AND deleted_at IS NULL";
                    break;
                case 'allocations':
                    $sql = "SELECT a.id, p.project_code, p.name as project_name, a.amount 
                           FROM allocations a 
                           JOIN projects p ON a.project_id = p.id 
                           WHERE a.id = ?";
                    break;
                case 'expenses':
                    $sql = "SELECT e.id, p.project_code, p.name as project_name, e.amount, e.category 
                           FROM expenses e 
                           JOIN projects p ON e.project_id = p.id 
                           WHERE e.id = ?";
                    break;
                case 'finances':
                    $sql = "SELECT id, amount, description, status FROM finances WHERE id = ?";
                    break;
                default:
                    return null;
            }
            
            return $this->db->queryOne($sql, [$recordId]);
        } catch (\Exception $e) {
            Logger::getInstance()->error("Failed to get record details: " . $e->getMessage());
            return null;
        }
    }
    
    private function categorizeAction($action)
    {
        if (strpos($action, 'LOGIN') !== false || strpos($action, 'LOGOUT') !== false) {
            return 'authentication';
        } elseif (strpos($action, 'CREATE') !== false) {
            return 'create';
        } elseif (strpos($action, 'UPDATE') !== false) {
            return 'update';
        } elseif (strpos($action, 'DELETE') !== false) {
            return 'delete';
        } elseif (strpos($action, 'APPROVE') !== false || strpos($action, 'REJECT') !== false) {
            return 'approval';
        } else {
            return 'other';
        }
    }
    
    private function generateDescription($record)
    {
        $user = $record['user_name'] ?: 'System';
        $action = strtolower(str_replace('_', ' ', $record['action']));
        
        if ($record['table_name'] && $record['record_id']) {
            return "$user $action {$record['table_name']} record {$record['record_id']}";
        }
        
        return "$user $action";
    }
    
    private function parseUserAgent($userAgent)
    {
        if (!$userAgent) return 'Unknown';
        
        if (strpos($userAgent, 'Mobile') !== false) {
            return 'Mobile Device';
        } elseif (strpos($userAgent, 'Tablet') !== false) {
            return 'Tablet';
        } else {
            return 'Desktop';
        }
    }
    
    private function getLocationFromIP($ip)
    {
        if ($ip === '127.0.0.1' || $ip === '::1') {
            return 'Localhost';
        }
        
        return 'Unknown';
    }
    
    private function getDateCondition($period)
    {
        $intervals = [
            '7d' => 'INTERVAL 7 DAY',
            '30d' => 'INTERVAL 30 DAY',
            '90d' => 'INTERVAL 90 DAY',
            '1y' => 'INTERVAL 1 YEAR'
        ];
        
        $interval = $intervals[$period] ?? $intervals['30d'];
        return "created_at >= DATE_SUB(NOW(), $interval)";
    }
}