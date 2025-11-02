<?php

namespace App\Services;

use App\Models\Project;
use App\Utils\Database;
use Ramsey\Uuid\Uuid;

class ProjectService
{
    private $projectModel;
    private $db;
    
    public function __construct()
    {
        $this->projectModel = new Project();
        $this->db = Database::getInstance();
    }
    
    public function getAll($userId = null, $role = null)
    {
        if ($role === 'admin' || $role === 'finance_manager') {
            $projects = $this->db->query(
                "SELECT * FROM projects WHERE deleted_at IS NULL ORDER BY created_at DESC"
            );
        } else if ($userId) {
            $sql = "SELECT p.* FROM projects p 
                    INNER JOIN project_users pu ON p.id = pu.project_id 
                    WHERE pu.user_id = ? AND p.deleted_at IS NULL
                    ORDER BY p.created_at DESC";
            $projects = $this->db->query($sql, [$userId]);
        } else {
            $projects = [];
        }
        
        // Enhance each project with balance information
        return $this->enhanceProjectsWithBalance($projects);
    }
    
    public function getById($id, $userId = null, $role = null)
    {
        // Always check if project exists first
        $project = $this->projectModel->find($id);
        if (!$project) {
            return null;
        }
        
        // If user is admin or finance manager, return project
        if ($role === 'admin' || $role === 'finance_manager') {
            return $this->enhanceProjectWithBalance($project);
        }
        
        // For regular users, check if they're assigned to the project
        if ($userId) {
            $sql = "SELECT p.* FROM projects p
                    INNER JOIN project_users pu ON p.id = pu.project_id
                    WHERE p.id = ? AND pu.user_id = ? AND p.deleted_at IS NULL";
            $project = $this->db->queryOne($sql, [$id, $userId]);
            if ($project) {
                return $this->enhanceProjectWithBalance($project);
            }
        }
        
        return null;
    }
    
    public function create($data)
    {
        $existing = $this->db->queryOne(
            "SELECT id FROM projects WHERE project_code = ?",
            [$data['project_code']]
        );
        
        if ($existing) {
            return ['success' => false, 'message' => 'Project code already exists'];
        }
        
        $projectId = Uuid::uuid4()->toString();
        $this->db->execute(
            "INSERT INTO projects (id, project_code, name, description, start_date, end_date, status, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $projectId,
                $data['project_code'],
                $data['name'],
                $data['description'] ?? null,
                $data['start_date'] ?? null,
                $data['end_date'] ?? null,
                $data['status'] ?? 'planning',
                $data['created_by'] ?? null
            ]
        );
        
        $project = $this->projectModel->find($projectId);
        return ['success' => true, 'data' => $this->enhanceProjectWithBalance($project)];
    }
    
    public function update($id, $data)
    {
        $project = $this->projectModel->find($id);
        if (!$project) {
            return ['success' => false, 'message' => 'Project not found'];
        }
        
        if (isset($data['project_code']) && $data['project_code'] !== $project['project_code']) {
            $existing = $this->db->queryOne(
                "SELECT id FROM projects WHERE project_code = ? AND id != ?",
                [$data['project_code'], $id]
            );
            
            if ($existing) {
                return ['success' => false, 'message' => 'Project code already exists'];
            }
        }
        
        $updateFields = [];
        $params = [];
        
        if (isset($data['project_code'])) {
            $updateFields[] = "project_code = ?";
            $params[] = $data['project_code'];
        }
        
        if (isset($data['name'])) {
            $updateFields[] = "name = ?";
            $params[] = $data['name'];
        }
        
        if (isset($data['description'])) {
            $updateFields[] = "description = ?";
            $params[] = $data['description'];
        }
        
        if (isset($data['start_date'])) {
            $updateFields[] = "start_date = ?";
            $params[] = $data['start_date'];
        }
        
        if (isset($data['end_date'])) {
            $updateFields[] = "end_date = ?";
            $params[] = $data['end_date'];
        }
        
        if (isset($data['status'])) {
            $updateFields[] = "status = ?";
            $params[] = $data['status'];
        }
        
        if (empty($updateFields)) {
            return ['success' => true, 'data' => $this->enhanceProjectWithBalance($project)];
        }
        
        $updateFields[] = "updated_at = NOW()";
        $params[] = $id;
        
        $sql = "UPDATE projects SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $this->db->execute($sql, $params);
        
        $updatedProject = $this->projectModel->find($id);
        return ['success' => true, 'data' => $this->enhanceProjectWithBalance($updatedProject)];
    }
    
    public function delete($id)
    {
        $project = $this->projectModel->find($id);
        if (!$project) {
            return ['success' => false, 'message' => 'Project not found'];
        }
        
        $this->db->execute(
            "UPDATE projects SET deleted_at = NOW() WHERE id = ?",
            [$id]
        );
        
        return ['success' => true, 'message' => 'Project deleted successfully'];
    }
    
    public function assignUser($projectId, $userId, $assignedBy)
    {
        $project = $this->projectModel->find($projectId);
        if (!$project) {
            return ['success' => false, 'message' => 'Project not found'];
        }
        
        $user = $this->db->queryOne(
            "SELECT id, role FROM users WHERE id = ? AND deleted_at IS NULL",
            [$userId]
        );
        
        if (!$user) {
            return ['success' => false, 'message' => 'User not found'];
        }
        
        // Prevent assigning admin users to projects
        if ($user['role'] === 'admin') {
            return ['success' => false, 'message' => 'Cannot assign admin users to projects'];
        }
        
        $existing = $this->db->queryOne(
            "SELECT id FROM project_users WHERE project_id = ? AND user_id = ?",
            [$projectId, $userId]
        );
        
        if ($existing) {
            return ['success' => false, 'message' => 'User already assigned to this project'];
        }
        
        $id = Uuid::uuid4()->toString();
        $this->db->execute(
            "INSERT INTO project_users (id, project_id, user_id, assigned_by) VALUES (?, ?, ?, ?)",
            [$id, $projectId, $userId, $assignedBy]
        );
        
        return ['success' => true, 'message' => 'User assigned to project successfully'];
    }
    
    public function removeUser($projectId, $userId)
    {
        $existing = $this->db->queryOne(
            "SELECT id FROM project_users WHERE project_id = ? AND user_id = ?",
            [$projectId, $userId]
        );
        
        if (!$existing) {
            return ['success' => false, 'message' => 'User not assigned to this project'];
        }
        
        $this->db->execute(
            "DELETE FROM project_users WHERE project_id = ? AND user_id = ?",
            [$projectId, $userId]
        );
        
        return ['success' => true, 'message' => 'User removed from project successfully'];
    }
    
    public function getBalance($projectId)
    {
        // Fixed: Use 'id' column instead of 'project_id'
        return $this->db->queryOne(
            "SELECT * FROM project_balances WHERE id = ?",
            [$projectId]
        );
    }
    
    public function getProjectUsers($projectId)
    {
        $sql = "SELECT u.id, u.email, u.first_name, u.last_name, u.role, pu.assigned_at
                FROM users u
                INNER JOIN project_users pu ON u.id = pu.user_id
                WHERE pu.project_id = ? AND u.deleted_at IS NULL
                ORDER BY pu.assigned_at DESC";
        
        return $this->db->query($sql, [$projectId]);
    }
    
    // Helper method to check if project exists (without user restrictions)
    public function projectExists($id)
    {
        return $this->projectModel->find($id) !== null;
    }
    
    // Helper method to enhance a single project with balance information
    private function enhanceProjectWithBalance($project)
    {
        if (!$project) {
            return $project;
        }
        
        try {
            $balance = $this->getBalance($project['id']);
            $project['balance'] = $balance ?: [
                'total_deposits' => 0,
                'unallocated_balance' => 0,
                'allocated_balance' => 0,
                'total_spent' => 0,
                'remaining_balance' => 0
            ];
        } catch (\Exception $e) {
            // If balance table doesn't exist or has issues, set default balance
            $project['balance'] = [
                'total_deposits' => 0,
                'unallocated_balance' => 0,
                'allocated_balance' => 0,
                'total_spent' => 0,
                'remaining_balance' => 0
            ];
        }
        
        // Calculate remaining balance if not present
        if (!isset($project['balance']['remaining_balance'])) {
            $project['balance']['remaining_balance'] = 
                ($project['balance']['total_deposits'] ?? 0) - 
                ($project['balance']['total_spent'] ?? 0);
        }
        
        return $project;
    }
    
    // Helper method to enhance multiple projects with balance information
    private function enhanceProjectsWithBalance($projects)
    {
        if (empty($projects)) {
            return $projects;
        }
        
        $enhancedProjects = [];
        foreach ($projects as $project) {
            $enhancedProjects[] = $this->enhanceProjectWithBalance($project);
        }
        
        return $enhancedProjects;
    }
}