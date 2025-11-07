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
            return $this->getAdminDashboard();
        } else {
            return $this->getUserDashboard($currentUser['id']);
        }
    }
    
    private function getAdminDashboard()
    {
        $totalDeposits = $this->getTotalDeposits();
        $totalAllocated = $this->getTotalAllocated();
        $totalSpent = $this->getTotalSpent();
        $availableBalance = $totalDeposits - $totalAllocated;
        
        return [
            'stats' => [
                'total_projects' => $this->getTotalProjects(),
                'active_projects' => $this->getActiveProjects(),
                'total_users' => $this->getTotalUsers(),
                'total_deposits' => $totalDeposits,
                'total_allocated' => $totalAllocated,
                'total_spent' => $totalSpent,
                'available_balance' => $availableBalance,
                'pending_expenses' => $this->getPendingExpensesCount(),
                'budget_utilization' => $this->getBudgetUtilization($totalSpent, $totalDeposits)
            ],
            'recent_projects' => $this->getRecentProjects(),
            'pending_expenses' => $this->getPendingExpenses(),
            'recent_allocations' => $this->getRecentAllocations(),
            'top_spending_users' => $this->getTopSpendingUsers(),
            'monthly_spending' => $this->getMonthlySpending(),
            'project_allocations' => $this->getProjectAllocationsSummary()
        ];
    }
    
    private function getUserDashboard($userId)
    {
        $userAllocations = $this->getUserAllocations($userId);
        $userExpenses = $this->getUserExpenses($userId);
        $userBalance = $userAllocations - $userExpenses;
        
        return [
            'stats' => [
                'my_projects' => $this->getUserProjectsCount($userId),
                'total_allocated' => $userAllocations,
                'total_spent' => $userExpenses,
                'remaining_balance' => $userBalance,
                'pending_expenses' => $this->getUserPendingExpensesCount($userId)
            ],
            'my_projects' => $this->getUserProjects($userId),
            'recent_expenses' => $this->getUserRecentExpenses($userId),
            'recent_allocations' => $this->getUserRecentAllocations($userId),
            'monthly_expenses' => $this->getUserMonthlyExpenses($userId),
            'project_balances' => $this->getUserProjectBalances($userId)
        ];
    }
    
    // ADMIN METHODS - SYSTEM WIDE TOTALS
    
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
            "SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL AND role = 'user'"
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
    
    private function getBudgetUtilization($totalSpent, $totalDeposits)
    {
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
                u.first_name as allocated_by_first_name, u.last_name as allocated_by_last_name
                FROM allocations a
                INNER JOIN projects p ON a.project_id = p.id
                LEFT JOIN users u ON a.allocated_by = u.id
                WHERE a.status = 'approved'
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
    
    private function getProjectAllocationsSummary()
    {
        $sql = "SELECT p.id, p.project_code, p.name,
                COALESCE(SUM(a.amount), 0) as total_allocated,
                COALESCE(SUM(e.amount), 0) as total_spent,
                COALESCE(SUM(a.amount), 0) - COALESCE(SUM(e.amount), 0) as remaining_balance
                FROM projects p
                LEFT JOIN allocations a ON p.id = a.project_id AND a.status = 'approved'
                LEFT JOIN expenses e ON p.id = e.project_id AND e.status = 'approved'
                WHERE p.deleted_at IS NULL
                GROUP BY p.id, p.project_code, p.name
                ORDER BY total_allocated DESC
                LIMIT 10";
        
        return $this->db->query($sql);
    }
    
    // USER METHODS - USER SPECIFIC DATA
    
    private function getUserProjectsCount($userId)
    {
        $result = $this->db->queryOne(
            "SELECT COUNT(DISTINCT p.id) as count 
             FROM projects p
             INNER JOIN project_users pu ON p.id = pu.project_id
             WHERE pu.user_id = ? AND p.deleted_at IS NULL",
            [$userId]
        );
        return (int)($result['count'] ?? 0);
    }
    
    private function getUserAllocations($userId)
    {
        // Get allocations for projects where user is assigned
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
        // Get expenses submitted by this user that are approved
        $result = $this->db->queryOne(
            "SELECT COALESCE(SUM(amount), 0) as total 
             FROM expenses 
             WHERE user_id = ? AND status = 'approved'",
            [$userId]
        );
        return (float)($result['total'] ?? 0);
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
                pu.assigned_at,
                COALESCE(SUM(CASE WHEN a.status = 'approved' THEN a.amount ELSE 0 END), 0) as total_allocated,
                COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0) as total_spent,
                COALESCE(SUM(CASE WHEN a.status = 'approved' THEN a.amount ELSE 0 END), 0) - 
                COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0) as remaining_balance
                FROM projects p
                INNER JOIN project_users pu ON p.id = pu.project_id
                LEFT JOIN allocations a ON p.id = a.project_id
                LEFT JOIN expenses e ON p.id = e.project_id
                WHERE pu.user_id = ? AND p.deleted_at IS NULL
                GROUP BY p.id, p.project_code, p.name, p.description, p.status, p.start_date, p.end_date, pu.assigned_at
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
                WHERE pu.user_id = ? AND a.status = 'approved'
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
    
    private function getUserProjectBalances($userId)
    {
        $sql = "SELECT p.id, p.project_code, p.name,
                COALESCE(SUM(CASE WHEN a.status = 'approved' THEN a.amount ELSE 0 END), 0) as total_allocated,
                COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0) as total_spent,
                COALESCE(SUM(CASE WHEN a.status = 'approved' THEN a.amount ELSE 0 END), 0) - 
                COALESCE(SUM(CASE WHEN e.status = 'approved' THEN e.amount ELSE 0 END), 0) as remaining_balance
                FROM projects p
                INNER JOIN project_users pu ON p.id = pu.project_id
                LEFT JOIN allocations a ON p.id = a.project_id
                LEFT JOIN expenses e ON p.id = e.project_id
                WHERE pu.user_id = ? AND p.deleted_at IS NULL
                GROUP BY p.id, p.project_code, p.name
                HAVING total_allocated > 0 OR total_spent > 0
                ORDER BY remaining_balance DESC";
        
        return $this->db->query($sql, [$userId]);
    }
}