<?php

namespace App\Services;

use App\Models\Project;
use App\Utils\Database;
use Ramsey\Uuid\Uuid;

class ProjectService
{
    private $projectModel;
    private $db;
    private $notificationService;
    
    public function __construct()
    {
        $this->projectModel = new Project();
        $this->db = Database::getInstance();
        $this->notificationService = new NotificationService();
    }
    
    public function getAll($userId = null, $role = null, $page = 1, $perPage = 5)
    {
        $baseSql = "SELECT * FROM projects WHERE deleted_at IS NULL";
        $baseSqlWithJoin = "SELECT p.* FROM projects p 
                    INNER JOIN project_users pu ON p.id = pu.project_id 
                    WHERE pu.user_id = ? AND p.deleted_at IS NULL";
        
        if (in_array($role, ['admin', 'super_admin'])) {
            $countSql = "SELECT COUNT(*) as total FROM projects WHERE deleted_at IS NULL";
            $countResult = $this->db->queryOne($countSql);
            $total = $countResult['total'] ?? 0;
            
            $offset = ($page - 1) * $perPage;
            $sql = $baseSql . " ORDER BY created_at DESC LIMIT " . (int)$perPage . " OFFSET " . (int)$offset;
            $projects = $this->db->query($sql);
        } else if ($userId) {
            $countSql = "SELECT COUNT(*) as total FROM projects p 
                        INNER JOIN project_users pu ON p.id = pu.project_id 
                        WHERE pu.user_id = ? AND p.deleted_at IS NULL";
            $countResult = $this->db->queryOne($countSql, [$userId]);
            $total = $countResult['total'] ?? 0;
            
            $offset = ($page - 1) * $perPage;
            $sql = $baseSqlWithJoin . " ORDER BY p.created_at DESC LIMIT " . (int)$perPage . " OFFSET " . (int)$offset;
            $projects = $this->db->query($sql, [$userId]);
        } else {
            $projects = [];
            $total = 0;
        }
        
        $enhancedProjects = $this->enhanceProjectsWithBalance($projects);
        
        return [
            'data' => $enhancedProjects,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage
        ];
    }
    
    public function getById($id, $userId = null, $role = null)
    {
        // Always check if project exists first
        $project = $this->projectModel->find($id);
        if (!$project) {
            return null;
        }
        
        // If user is admin, return project
        if (in_array($role, ['admin', 'super_admin'])) {
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
        try {
            $projectCode = isset($data['project_code']) ? strtoupper(trim($data['project_code'])) : '';
            
            if (empty($projectCode)) {
                $projectCode = $this->generateProjectCode($data['name'] ?? 'PJ');
            } else {
                $existing = $this->db->queryOne(
                    "SELECT id FROM projects WHERE project_code = ?",
                    [$projectCode]
                );
                
                if ($existing) {
                    return ['success' => false, 'message' => 'Project code already exists'];
                }
            }
            
            $projectId = Uuid::uuid4()->toString();
            
            // Start transaction for data consistency
            $this->db->beginTransaction();
            
            // Insert the main project
            $this->db->execute(
                "INSERT INTO projects (id, project_code, name, description, start_date, end_date, status, created_by) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    $projectId,
                    $projectCode,
                    $data['name'],
                    $data['description'] ?? null,
                    $data['start_date'] ?? null,
                    $data['end_date'] ?? null,
                    $data['status'] ?? 'planning',
                    $data['created_by'] ?? null
                ]
            );
            
            // Insert expense types if provided
            if (!empty($data['expense_types']) && is_array($data['expense_types'])) {
                foreach ($data['expense_types'] as $typeName) {
                    $typeName = trim((string)$typeName);
                    if ($typeName === '') { 
                        continue; 
                    }
                    
                    // Check if expense type already exists for this project
                    $existingType = $this->db->queryOne(
                        "SELECT id FROM project_expense_types WHERE project_id = ? AND name = ?",
                        [$projectId, $typeName]
                    );
                    
                    if (!$existingType) {
                        $this->db->execute(
                            "INSERT INTO project_expense_types (id, project_id, name) VALUES (?, ?, ?)",
                            [Uuid::uuid4()->toString(), $projectId, $typeName]
                        );
                    }
                }
            }
            
            // Assign user if provided during project creation
            if (!empty($data['assigned_user_id'])) {
                $this->assignUserToProject($projectId, $data['assigned_user_id'], $data['created_by'] ?? null);
            }
            
            // Commit transaction
            $this->db->commit();
            
            $project = $this->projectModel->find($projectId);
            return ['success' => true, 'data' => $this->enhanceProjectWithBalance($project)];
            
        } catch (\Exception $e) {
            // Rollback on error
            $this->db->rollback();
            error_log("Project creation failed: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to create project: ' . $e->getMessage()];
        }
    }
    
    private function generateProjectCode($projectName)
    {
        $prefix = $this->generateProjectPrefix($projectName);
        $likePattern = $prefix . '%';
        
        $latest = $this->db->queryOne(
            "SELECT project_code FROM projects WHERE project_code LIKE ? ORDER BY project_code DESC LIMIT 1",
            [$likePattern]
        );
        
        $nextNumber = 1;
        if ($latest && isset($latest['project_code'])) {
            if (preg_match('/(\\d+)$/', $latest['project_code'], $matches)) {
                $nextNumber = ((int)$matches[1]) + 1;
            }
        }
        
        do {
            $code = $prefix . str_pad((string)$nextNumber, 3, '0', STR_PAD_LEFT);
            $existing = $this->db->queryOne(
                "SELECT id FROM projects WHERE project_code = ?",
                [$code]
            );
            if (!$existing) {
                return $code;
            }
            $nextNumber++;
        } while (true);
    }
    
    private function generateProjectPrefix($projectName)
    {
        if (empty($projectName)) {
            return 'PJ';
        }
        
        $cleanName = preg_replace('/[^A-Za-z0-9\s]/', ' ', $projectName);
        $words = preg_split('/\s+/', trim($cleanName));
        $prefix = '';
        foreach ($words as $word) {
            if ($word === '') {
                continue;
            }
            $prefix .= substr($word, 0, 1);
            if (strlen($prefix) >= 3) {
                break;
            }
        }
        
        if ($prefix === '') {
            $alnum = preg_replace('/[^A-Za-z0-9]/', '', $projectName);
            $prefix = substr($alnum, 0, 3);
        }
        
        $prefix = strtoupper($prefix);
        if (strlen($prefix) < 2) {
            $prefix = str_pad($prefix, 2, 'P');
        }
        
        return $prefix;
    }
    
    private function assignUserToProject($projectId, $userId, $assignedBy = null)
    {
        try {
            $user = $this->db->queryOne(
                "SELECT id, role FROM users WHERE id = ? AND deleted_at IS NULL",
                [$userId]
            );
            
            if (!$user) {
                throw new \Exception('User not found');
            }
            
            // Prevent assigning admin users to projects
            if (in_array($user['role'], ['admin', 'super_admin'])) {
                throw new \Exception('Cannot assign admin users to projects');
            }
            
            // Check if user is already assigned to this specific project
            $existingAssignment = $this->db->queryOne(
                "SELECT id FROM project_users WHERE project_id = ? AND user_id = ?",
                [$projectId, $userId]
            );
            
            if ($existingAssignment) {
                // User already assigned to this project, no need to reassign
                return true;
            }
            
            // Users can be assigned to multiple projects, so we don't remove existing assignments
            // Insert new assignment
            $id = Uuid::uuid4()->toString();
            $this->db->execute(
                "INSERT INTO project_users (id, project_id, user_id, assigned_by, assigned_at) VALUES (?, ?, ?, ?, NOW())",
                [$id, $projectId, $userId, $assignedBy]
            );
            
            // Verify the assignment was created
            $verifyAssignment = $this->db->queryOne(
                "SELECT id FROM project_users WHERE project_id = ? AND user_id = ?",
                [$projectId, $userId]
            );
            
            if (!$verifyAssignment) {
                throw new \Exception('Failed to verify user assignment');
            }
            
            // Get project and user details for notification
            $project = $this->projectModel->find($projectId);
            $assignedUser = $this->db->queryOne(
                "SELECT first_name, last_name FROM users WHERE id = ?",
                [$userId]
            );
            
            // Create notification for the assigned user
            if ($project && $assignedUser) {
                $this->notificationService->create(
                    $userId,
                    'project_assignment',
                    'Assigned to Project',
                    "You have been assigned to the project: {$project['name']}",
                    'project',
                    $projectId
                );
            }
            
            return true;
            
        } catch (\Exception $e) {
            error_log("User assignment during project creation failed: " . $e->getMessage());
            throw $e;
        }
    }
    
    public function update($id, $data)
    {
        try {
            $project = $this->projectModel->find($id);
            if (!$project) {
                return ['success' => false, 'message' => 'Project not found'];
            }
            
            if (isset($data['project_code'])) {
                $data['project_code'] = strtoupper(trim($data['project_code']));
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
            
            // Update expense types if provided
            if (!empty($data['expense_types']) && is_array($data['expense_types'])) {
                // Remove existing expense types for this project
                $this->db->execute(
                    "DELETE FROM project_expense_types WHERE project_id = ?",
                    [$id]
                );
                
                // Insert new expense types
                foreach ($data['expense_types'] as $typeName) {
                    $typeName = trim((string)$typeName);
                    if ($typeName === '') { 
                        continue; 
                    }
                    
                    $this->db->execute(
                        "INSERT INTO project_expense_types (id, project_id, name) VALUES (?, ?, ?)",
                        [Uuid::uuid4()->toString(), $id, $typeName]
                    );
                }
            }
            
            $updatedProject = $this->projectModel->find($id);
            return ['success' => true, 'data' => $this->enhanceProjectWithBalance($updatedProject)];
            
        } catch (\Exception $e) {
            error_log("Project update failed: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to update project: ' . $e->getMessage()];
        }
    }
    
    public function delete($id)
    {
        try {
            $project = $this->projectModel->find($id);
            if (!$project) {
                return ['success' => false, 'message' => 'Project not found'];
            }
            
            $this->db->execute(
                "UPDATE projects SET deleted_at = NOW() WHERE id = ?",
                [$id]
            );
            
            return ['success' => true, 'message' => 'Project deleted successfully'];
            
        } catch (\Exception $e) {
            error_log("Project deletion failed: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to delete project: ' . $e->getMessage()];
        }
    }
    
    public function assignUser($projectId, $userId, $assignedBy)
    {
        try {
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
            if (in_array($user['role'], ['admin', 'super_admin'])) {
                return ['success' => false, 'message' => 'Cannot assign admin users to projects'];
            }
            
            // Check if user is already assigned to this project
            $existing = $this->db->queryOne(
                "SELECT id FROM project_users WHERE project_id = ? AND user_id = ?",
                [$projectId, $userId]
            );
            
            if ($existing) {
                return ['success' => false, 'message' => 'User already assigned to this project'];
            }
            
            // Users can be assigned to multiple projects, so we don't remove existing assignments
            $id = Uuid::uuid4()->toString();
            $this->db->execute(
                "INSERT INTO project_users (id, project_id, user_id, assigned_by, assigned_at) VALUES (?, ?, ?, ?, NOW())",
                [$id, $projectId, $userId, $assignedBy]
            );
            
            // Get user details for notification
            $assignedUser = $this->db->queryOne(
                "SELECT first_name, last_name FROM users WHERE id = ?",
                [$userId]
            );
            
            // Create notification for the assigned user
            $this->notificationService->create(
                $userId,
                'project_assignment',
                'Assigned to Project',
                "You have been assigned to the project: {$project['name']}",
                'project',
                $projectId
            );
            
            return ['success' => true, 'message' => 'User assigned to project successfully'];
            
        } catch (\Exception $e) {
            error_log("User assignment failed: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to assign user: ' . $e->getMessage()];
        }
    }
    
    public function removeUser($projectId, $userId)
    {
        try {
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
            
        } catch (\Exception $e) {
            error_log("User removal failed: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to remove user: ' . $e->getMessage()];
        }
    }
    
    public function getBalance($projectId)
    {
        try {
            return $this->db->queryOne(
                "SELECT * FROM project_balances WHERE id = ?",
                [$projectId]
            );
        } catch (\Exception $e) {
            error_log("Balance query failed: " . $e->getMessage());
            return null;
        }
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
    
    public function getProjectExpenseTypes($projectId)
    {
        try {
            return $this->db->query(
                "SELECT id, name, created_at FROM project_expense_types WHERE project_id = ? ORDER BY name",
                [$projectId]
            );
        } catch (\Exception $e) {
            error_log("Expense types query failed: " . $e->getMessage());
            return [];
        }
    }
    
    public function updateExpenseTypes($projectId, $expenseTypes)
    {
        try {
            if (!$this->projectExists($projectId)) {
                return ['success' => false, 'message' => 'Project not found'];
            }
            
            // Start transaction
            $this->db->beginTransaction();
            
            // Remove existing expense types
            $this->db->execute(
                "DELETE FROM project_expense_types WHERE project_id = ?",
                [$projectId]
            );
            
            // Insert new expense types
            foreach ($expenseTypes as $typeName) {
                $typeName = trim((string)$typeName);
                if ($typeName === '') continue;
                
                $this->db->execute(
                    "INSERT INTO project_expense_types (id, project_id, name) VALUES (?, ?, ?)",
                    [Uuid::uuid4()->toString(), $projectId, $typeName]
                );
            }
            
            // Commit transaction
            $this->db->commit();
            
            $updatedTypes = $this->getProjectExpenseTypes($projectId);
            return ['success' => true, 'data' => $updatedTypes];
            
        } catch (\Exception $e) {
            // Rollback on error
            $this->db->rollback();
            error_log("Expense types update failed: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to update expense types: ' . $e->getMessage()];
        }
    }
    
    public function addExpenseType($projectId, $typeName)
    {
        try {
            if (!$this->projectExists($projectId)) {
                return ['success' => false, 'message' => 'Project not found'];
            }
            
            $typeName = trim((string)$typeName);
            if ($typeName === '') {
                return ['success' => false, 'message' => 'Expense type name cannot be empty'];
            }
            
            // Check if expense type already exists for this project
            $existingType = $this->db->queryOne(
                "SELECT id FROM project_expense_types WHERE project_id = ? AND name = ?",
                [$projectId, $typeName]
            );
            
            if ($existingType) {
                return ['success' => false, 'message' => 'Expense type already exists for this project'];
            }
            
            $id = Uuid::uuid4()->toString();
            $this->db->execute(
                "INSERT INTO project_expense_types (id, project_id, name) VALUES (?, ?, ?)",
                [$id, $projectId, $typeName]
            );
            
            $newType = $this->db->queryOne(
                "SELECT id, name, created_at FROM project_expense_types WHERE id = ?",
                [$id]
            );
            
            return ['success' => true, 'data' => $newType];
            
        } catch (\Exception $e) {
            error_log("Expense type addition failed: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to add expense type: ' . $e->getMessage()];
        }
    }
    
    public function deleteExpenseType($expenseTypeId, $projectId)
    {
        try {
            // Verify the expense type exists and belongs to the project
            $expenseType = $this->db->queryOne(
                "SELECT id, name FROM project_expense_types WHERE id = ? AND project_id = ?",
                [$expenseTypeId, $projectId]
            );
            
            if (!$expenseType) {
                return ['success' => false, 'message' => 'Expense type not found or does not belong to this project'];
            }
            
            // Check if this expense type is being used in any expenses
            $usedInExpenses = $this->db->queryOne(
                "SELECT COUNT(*) as count FROM expenses WHERE project_id = ? AND category = ?",
                [$projectId, $expenseType['name']]
            );
            
            if ($usedInExpenses && $usedInExpenses['count'] > 0) {
                return ['success' => false, 'message' => 'Cannot delete expense type that is being used in existing expenses'];
            }
            
            // Delete the expense type
            $this->db->execute(
                "DELETE FROM project_expense_types WHERE id = ? AND project_id = ?",
                [$expenseTypeId, $projectId]
            );
            
            return [
                'success' => true, 
                'message' => 'Expense type deleted successfully',
                'deleted_type' => $expenseType
            ];
            
        } catch (\Exception $e) {
            error_log("Expense type deletion failed: " . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to delete expense type: ' . $e->getMessage()];
        }
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
            // If balance view doesn't exist or has issues, set default balance
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
        
        // Get expense types for this project
        try {
            $project['expense_types'] = $this->getProjectExpenseTypes($project['id']);
        } catch (\Exception $e) {
            $project['expense_types'] = [];
        }
        
        // Get users assigned to this project
        try {
            $project['users'] = $this->getProjectUsers($project['id']);
        } catch (\Exception $e) {
            $project['users'] = [];
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