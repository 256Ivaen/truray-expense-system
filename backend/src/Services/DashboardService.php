<?php

namespace App\Services;

use App\Utils\Database;

class DashboardService
{
    private $db;
    
    public function __construct()
    {
        $this->db = Database::getInstance();
    }
    
    public function getDashboardData($currentUser)
    {
        if (in_array($currentUser['role'], ['admin', 'super_admin'])) {
        if (in_array($currentUser['role'], ['admin', 'super_admin'])) {
            return $this->getAdminDashboard();
        } else {
            return $this->getUserDashboard($currentUser['id']);
        }
    }
    
    private function getAdminDashboard()
    {
        return [
            'stats' => [
                'total_projects' => $this->getTotalProjects(),
                'active_projects' => $this->getActiveProjects(),
                'total_users' => $this->getTotalUsers(),
                'total_deposits' => $this->getTotalDeposits(),
                'total_allocated' => $this->getTotalAllocated(),
                'total_spent' => $this->getTotalSpent(),
                'pending_expenses' => $this->getPendingExpensesCount(),
                'budget_utilization' => $this->getBudgetUtilization()
            ],
            'recent_projects' => $this->getRecentProjects(),
            'pending_expenses' => $this->getPendingExpenses(),
            'recent_allocations' => $this->getRecentAllocations(),
            'top_spending_users' => $this->getTopSpendingUsers(),
            'monthly_spending' => $this->getMonthlySpending()
        ];
    }
    
    private function getUserDashboard($userId)
    {
        return [
            'stats' => [
                'my_projects' => $this->getUserProjectsCount($userId),
                'total_allocated' => $this->getUserAllocations($userId),
                'total_spent' => $this->getUserExpenses($userId),
                'remaining_balance' => $this->getUserBalance($userId),
                'pending_expenses' => $this->getUserPendingExpensesCount($userId)
            ],
            'my_projects' => $this->getUserProjects($userId),
            'recent_expenses' => $this->getUserRecentExpenses($userId),
            'recent_allocations' => $this->getUserRecentAllocations($userId),
            'monthly_expenses' => $this->getUserMonthlyExpenses($userId)
        ];
    }
    
    private function getTotalProjects()
    {
        $result = $this->db->queryOne(
            "SELECT COUNT(*) as count FROM projects WHERE deleted_at IS NULL"
        );
        return (int)($result['count'] ?? 0);
    }
    
    private function getActiveProjects()
    {
        $result = $this->db->queryOne(
            "SELECT COUNT(*) as count FROM projects WHERE status = 'active' AND deleted_at IS NULL"
        );
        return (int)($result['count'] ?? 0);
    }
    
    private function getTotalUsers()
    {
        $result = $this->db->queryOne(
            "SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL"
        );
        return (int)($result['count'] ?? 0);
    }
    
    private function getTotalDeposits()
    {
        $result = $this->db->queryOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM finances WHERE status = 'approved'"
        );
        return (float)($result['total'] ?? 0);
    }
    
    private function getTotalAllocated()
    {
        $result = $this->db->queryOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM allocations WHERE status = 'approved'"
        );
        return (float)($result['total'] ?? 0);
    }
    
    private function getTotalSpent()
    {
        $result = $this->db->queryOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE status = 'approved'"
        );
        return (float)($result['total'] ?? 0);
    }
    
    private function getPendingExpensesCount()
    {
        $result = $this->db->queryOne(
            "SELECT COUNT(*) as count FROM expenses WHERE status = 'pending'"
        );
        return (int)($result['count'] ?? 0);
    }
    
    private function getBudgetUtilization()
    {
        $totalDeposits = $this->getTotalDeposits();
        $totalSpent = $this->getTotalSpent();
        
        if ($totalDeposits == 0) {
            return 0;
        }
        
        return round(($totalSpent / $totalDeposits) * 100, 2);
    }
    
    private function getRecentProjects()
    {
        $sql = "SELECT id, project_code, name, description, status, start_date, end_date, created_at, updated_at
                FROM projects 
                WHERE deleted_at IS NULL 
                ORDER BY created_at DESC 
                LIMIT 5";
        
        return $this->db->query($sql);
    }
    
    private function getPendingExpenses()
    {
        $sql = "SELECT e.id, e.amount, e.description, e.status, e.spent_at,
                p.name as project_name, p.project_code,
                u.first_name, u.last_name, u.email
                FROM expenses e
                INNER JOIN projects p ON e.project_id = p.id
                INNER JOIN users u ON e.user_id = u.id
                WHERE e.status = 'pending'
                ORDER BY e.spent_at DESC
                LIMIT 5";
        
        return $this->db->query($sql);
    }
    
    private function getRecentAllocations()
    {
        $sql = "SELECT a.id, a.amount, a.description, a.status, a.allocated_at,
                p.name as project_name, p.project_code,
                u.first_name, u.last_name, u.email
                FROM allocations a
                INNER JOIN projects p ON a.project_id = p.id
                LEFT JOIN users u ON a.allocated_by = u.id
                ORDER BY a.allocated_at DESC
                LIMIT 5";
        
        return $this->db->query($sql);
    }
    
    private function getTopSpendingUsers()
    {
        $sql = "SELECT u.id, u.first_name, u.last_name, u.email,
                COALESCE(SUM(e.amount), 0) as total_spent,
                COUNT(e.id) as expense_count
                FROM users u
                LEFT JOIN expenses e ON u.id = e.user_id AND e.status = 'approved'
                WHERE u.deleted_at IS NULL AND u.role = 'user'
                GROUP BY u.id, u.first_name, u.last_name, u.email
                HAVING total_spent > 0
                ORDER BY total_spent DESC
                LIMIT 5";
        
        return $this->db->query($sql);
    }
    
    private function getMonthlySpending()
    {
        $sql = "SELECT 
                DATE_FORMAT(spent_at, '%Y-%m') as month,
                DATE_FORMAT(spent_at, '%M %Y') as month_name,
                COALESCE(SUM(amount), 0) as total
                FROM expenses
                WHERE status = 'approved' 
                AND spent_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                AND spent_at IS NOT NULL
                GROUP BY DATE_FORMAT(spent_at, '%Y-%m'), DATE_FORMAT(spent_at, '%M %Y')
                ORDER BY month DESC
                LIMIT 6";
        
        $results = $this->db->query($sql);
        return array_reverse($results);
    }
    
    private function getUserProjectsCount($userId)
    {
        $result = $this->db->queryOne(
            "SELECT COUNT(DISTINCT project_id) as count 
             FROM project_users 
             WHERE user_id = ?",
            [$userId]
        );
        return (int)($result['count'] ?? 0);
    }
    
    private function getUserAllocations($userId)
    {
        $result = $this->db->queryOne(
            "SELECT COALESCE(SUM(a.amount), 0) as total 
             FROM allocations a
             INNER JOIN project_users pu ON a.project_id = pu.project_id
             WHERE pu.user_id = ? AND a.status = 'approved'",
            [$userId]
        );
        return (float)($result['total'] ?? 0);
    }
    
    private function getUserExpenses($userId)
    {
        $result = $this->db->queryOne(
            "SELECT COALESCE(SUM(amount), 0) as total 
             FROM expenses 
             WHERE user_id = ? AND status = 'approved'",
            [$userId]
        );
        return (float)($result['total'] ?? 0);
    }
    
    private function getUserBalance($userId)
    {
        $allocated = $this->getUserAllocations($userId);
        $spent = $this->getUserExpenses($userId);
        return $allocated - $spent;
    }
    
    private function getUserPendingExpensesCount($userId)
    {
        $result = $this->db->queryOne(
            "SELECT COUNT(*) as count 
             FROM expenses 
             WHERE user_id = ? AND status = 'pending'",
            [$userId]
        );
        return (int)($result['count'] ?? 0);
    }
    
    private function getUserProjects($userId)
    {
        $sql = "SELECT p.id, p.project_code, p.name, p.description, p.status, p.start_date, p.end_date,
                pu.assigned_at
                FROM projects p
                INNER JOIN project_users pu ON p.id = pu.project_id
                WHERE pu.user_id = ? AND p.deleted_at IS NULL
                ORDER BY pu.assigned_at DESC
                LIMIT 5";
        
        return $this->db->query($sql, [$userId]);
    }
    
    private function getUserRecentExpenses($userId)
    {
        $sql = "SELECT e.id, e.amount, e.description, e.status, e.spent_at,
                p.name as project_name, p.project_code
                FROM expenses e
                INNER JOIN projects p ON e.project_id = p.id
                WHERE e.user_id = ?
                ORDER BY e.spent_at DESC
                LIMIT 5";
        
        return $this->db->query($sql, [$userId]);
    }
    
    private function getUserRecentAllocations($userId)
    {
        $sql = "SELECT a.id, a.amount, a.description, a.status, a.allocated_at,
                p.name as project_name, p.project_code
                FROM allocations a
                INNER JOIN projects p ON a.project_id = p.id
                INNER JOIN project_users pu ON p.id = pu.project_id
                WHERE pu.user_id = ?
                ORDER BY a.allocated_at DESC
                LIMIT 5";
        
        return $this->db->query($sql, [$userId]);
    }
    
    private function getUserMonthlyExpenses($userId)
    {
        $sql = "SELECT 
                DATE_FORMAT(spent_at, '%Y-%m') as month,
                DATE_FORMAT(spent_at, '%M %Y') as month_name,
                COALESCE(SUM(amount), 0) as total
                FROM expenses
                WHERE user_id = ? 
                AND status = 'approved'
                AND spent_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                AND spent_at IS NOT NULL
                GROUP BY DATE_FORMAT(spent_at, '%Y-%m'), DATE_FORMAT(spent_at, '%M %Y')
                ORDER BY month DESC
                LIMIT 6";
        
        $results = $this->db->query($sql, [$userId]);
        return array_reverse($results);
    }
}