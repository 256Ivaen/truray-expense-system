<?php

namespace App\Controllers;

use App\Utils\Response;
use App\Utils\Database;
use App\Middleware\AuthMiddleware;

class ReportController
{
    private $db;
    
    public function __construct()
    {
        $this->db = Database::getInstance();
    }
    
    public function dashboard($data)
    {
        $currentUser = AuthMiddleware::user();
        
        if ($currentUser['role'] === 'admin') {
            $stats = [
                'total_projects' => $this->getTotalProjects(),
                'active_projects' => $this->getActiveProjects(),
                'total_users' => $this->getTotalUsers(),
                'total_deposits' => $this->getTotalDeposits(),
                'total_allocated' => $this->getTotalAllocated(),
                'total_spent' => $this->getTotalSpent(),
                'pending_expenses' => $this->getPendingExpenses(),
                'recent_activities' => $this->getRecentActivities()
            ];
        } else {
            $stats = [
                'my_projects' => $this->getUserProjects($currentUser['id']),
                'my_allocations' => $this->getUserAllocations($currentUser['id']),
                'my_expenses' => $this->getUserExpenses($currentUser['id']),
                'my_balance' => $this->getUserTotalBalance($currentUser['id']),
                'recent_expenses' => $this->getUserRecentExpenses($currentUser['id'])
            ];
        }
        
        return Response::success($stats);
    }
    
    public function projectSummary($data)
    {
        $sql = "SELECT * FROM project_balances ORDER BY created_at DESC";
        $projects = $this->db->query($sql);
        
        return Response::success($projects);
    }
    
    public function userSpending($data)
    {
        $sql = "SELECT u.id, u.first_name, u.last_name, u.email,
                COUNT(DISTINCT pu.project_id) as total_projects,
                COALESCE(SUM(a.amount), 0) as total_allocated,
                COALESCE(SUM(e.amount), 0) as total_spent,
                (COALESCE(SUM(a.amount), 0) - COALESCE(SUM(e.amount), 0)) as remaining_balance
                FROM users u
                LEFT JOIN project_users pu ON u.id = pu.user_id
                LEFT JOIN allocations a ON u.id = a.user_id AND a.status = 'approved'
                LEFT JOIN expenses e ON u.id = e.user_id AND e.status = 'approved'
                WHERE u.deleted_at IS NULL AND u.role = 'user'
                GROUP BY u.id, u.first_name, u.last_name, u.email
                ORDER BY total_spent DESC";
        
        $users = $this->db->query($sql);
        
        return Response::success($users);
    }
    
    public function financialOverview($data)
    {
        $overview = [
            'total_deposits' => $this->getTotalDeposits(),
            'total_allocated' => $this->getTotalAllocated(),
            'total_spent' => $this->getTotalSpent(),
            'unallocated_funds' => $this->getTotalDeposits() - $this->getTotalAllocated(),
            'allocated_balance' => $this->getTotalAllocated() - $this->getTotalSpent(),
            'projects_by_status' => $this->getProjectsByStatus(),
            'expenses_by_status' => $this->getExpensesByStatus(),
            'monthly_spending' => $this->getMonthlySpending()
        ];
        
        return Response::success($overview);
    }
    
    private function getTotalProjects()
    {
        $result = $this->db->queryOne(
            "SELECT COUNT(*) as count FROM projects WHERE deleted_at IS NULL"
        );
        return $result['count'] ?? 0;
    }
    
    private function getActiveProjects()
    {
        $result = $this->db->queryOne(
            "SELECT COUNT(*) as count FROM projects WHERE status = 'active' AND deleted_at IS NULL"
        );
        return $result['count'] ?? 0;
    }
    
    private function getTotalUsers()
    {
        $result = $this->db->queryOne(
            "SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL"
        );
        return $result['count'] ?? 0;
    }
    
    private function getTotalDeposits()
    {
        $result = $this->db->queryOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM finances WHERE status = 'approved'"
        );
        return $result['total'] ?? 0;
    }
    
    private function getTotalAllocated()
    {
        $result = $this->db->queryOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM allocations WHERE status = 'approved'"
        );
        return $result['total'] ?? 0;
    }
    
    private function getTotalSpent()
    {
        $result = $this->db->queryOne(
            "SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE status = 'approved'"
        );
        return $result['total'] ?? 0;
    }
    
    private function getPendingExpenses()
    {
        $result = $this->db->queryOne(
            "SELECT COUNT(*) as count FROM expenses WHERE status = 'pending'"
        );
        return $result['count'] ?? 0;
    }
    
    private function getRecentActivities()
    {
        $sql = "SELECT action, table_name, created_at 
                FROM audit_logs 
                ORDER BY created_at DESC 
                LIMIT 10";
        return $this->db->query($sql);
    }
    
    private function getUserProjects($userId)
    {
        $result = $this->db->queryOne(
            "SELECT COUNT(DISTINCT project_id) as count 
             FROM project_users 
             WHERE user_id = ?",
            [$userId]
        );
        return $result['count'] ?? 0;
    }
    
    private function getUserAllocations($userId)
    {
        $result = $this->db->queryOne(
            "SELECT COALESCE(SUM(amount), 0) as total 
             FROM allocations 
             WHERE user_id = ? AND status = 'approved'",
            [$userId]
        );
        return $result['total'] ?? 0;
    }
    
    private function getUserExpenses($userId)
    {
        $result = $this->db->queryOne(
            "SELECT COALESCE(SUM(amount), 0) as total 
             FROM expenses 
             WHERE user_id = ? AND status = 'approved'",
            [$userId]
        );
        return $result['total'] ?? 0;
    }
    
    private function getUserTotalBalance($userId)
    {
        $allocated = $this->getUserAllocations($userId);
        $spent = $this->getUserExpenses($userId);
        return $allocated - $spent;
    }
    
    private function getUserRecentExpenses($userId)
    {
        $sql = "SELECT e.*, p.project_code, p.name as project_name
                FROM expenses e
                INNER JOIN projects p ON e.project_id = p.id
                WHERE e.user_id = ?
                ORDER BY e.spent_at DESC
                LIMIT 5";
        return $this->db->query($sql, [$userId]);
    }
    
    private function getProjectsByStatus()
    {
        $sql = "SELECT status, COUNT(*) as count 
                FROM projects 
                WHERE deleted_at IS NULL 
                GROUP BY status";
        return $this->db->query($sql);
    }
    
    private function getExpensesByStatus()
    {
        $sql = "SELECT status, COUNT(*) as count 
                FROM expenses 
                GROUP BY status";
        return $this->db->query($sql);
    }
    
    private function getMonthlySpending()
    {
        $sql = "SELECT 
                DATE_FORMAT(spent_at, '%Y-%m') as month,
                COALESCE(SUM(amount), 0) as total
                FROM expenses
                WHERE status = 'approved' AND spent_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
                GROUP BY DATE_FORMAT(spent_at, '%Y-%m')
                ORDER BY month DESC";
        return $this->db->query($sql);
    }
}