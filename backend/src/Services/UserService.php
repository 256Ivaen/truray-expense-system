<?php

namespace App\Services;

use App\Models\User;
use App\Utils\Database;
use Ramsey\Uuid\Uuid;

class UserService
{
    private $userModel;
    private $db;
    private $securityConfig;
    
    public function __construct()
    {
        $this->userModel = new User();
        $this->db = Database::getInstance();
        $this->securityConfig = require BASE_PATH . '/config/security.php';
    }
    
    public function getAll($filters = [])
    {
        $sql = "SELECT id, email, first_name, last_name, phone, role, status, created_at 
                FROM users WHERE deleted_at IS NULL";
        $params = [];
        
        if (isset($filters['role'])) {
            $sql .= " AND role = ?";
            $params[] = $filters['role'];
        }
        
        if (isset($filters['status'])) {
            $sql .= " AND status = ?";
            $params[] = $filters['status'];
        }
        
        $sql .= " ORDER BY created_at DESC";
        
        return $this->db->query($sql, $params);
    }
    
    public function getById($id)
    {
        return $this->userModel->find($id);
    }
    
    public function create($data)
    {
        $existing = $this->db->queryOne(
            "SELECT id FROM users WHERE email = ?",
            [$data['email']]
        );
        
        if ($existing) {
            return ['success' => false, 'message' => 'Email already exists'];
        }
        
        $passwordHash = password_hash($data['password'], PASSWORD_BCRYPT, [
            'cost' => $this->securityConfig['bcrypt_rounds']
        ]);
        
        $userId = Uuid::uuid4()->toString();
        $this->db->execute(
            "INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role, created_by) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $userId,
                $data['email'],
                $passwordHash,
                $data['first_name'],
                $data['last_name'],
                $data['phone'] ?? null,
                $data['role'],
                $data['created_by'] ?? null
            ]
        );
        
        $user = $this->userModel->find($userId);
        return ['success' => true, 'data' => $user];
    }
    
    public function update($id, $data)
    {
        $user = $this->userModel->find($id);
        if (!$user) {
            return ['success' => false, 'message' => 'User not found'];
        }
        
        if (isset($data['email']) && $data['email'] !== $user['email']) {
            $existing = $this->db->queryOne(
                "SELECT id FROM users WHERE email = ? AND id != ?",
                [$data['email'], $id]
            );
            
            if ($existing) {
                return ['success' => false, 'message' => 'Email already exists'];
            }
        }
        
        $updateFields = [];
        $params = [];
        
        if (isset($data['email'])) {
            $updateFields[] = "email = ?";
            $params[] = $data['email'];
        }
        
        if (isset($data['first_name'])) {
            $updateFields[] = "first_name = ?";
            $params[] = $data['first_name'];
        }
        
        if (isset($data['last_name'])) {
            $updateFields[] = "last_name = ?";
            $params[] = $data['last_name'];
        }
        
        if (isset($data['phone'])) {
            $updateFields[] = "phone = ?";
            $params[] = $data['phone'];
        }
        
        if (isset($data['role'])) {
            $updateFields[] = "role = ?";
            $params[] = $data['role'];
        }
        
        if (isset($data['status'])) {
            $updateFields[] = "status = ?";
            $params[] = $data['status'];
        }
        
        if (isset($data['password'])) {
            $updateFields[] = "password_hash = ?";
            $params[] = password_hash($data['password'], PASSWORD_BCRYPT, [
                'cost' => $this->securityConfig['bcrypt_rounds']
            ]);
        }
        
        if (empty($updateFields)) {
            return ['success' => true, 'data' => $user];
        }
        
        $updateFields[] = "updated_at = NOW()";
        $params[] = $id;
        
        $sql = "UPDATE users SET " . implode(", ", $updateFields) . " WHERE id = ?";
        $this->db->execute($sql, $params);
        
        $updatedUser = $this->userModel->find($id);
        return ['success' => true, 'data' => $updatedUser];
    }
    
    public function delete($id)
    {
        $user = $this->userModel->find($id);
        if (!$user) {
            return ['success' => false, 'message' => 'User not found'];
        }
        
        $this->db->execute(
            "UPDATE users SET deleted_at = NOW() WHERE id = ?",
            [$id]
        );
        
        return ['success' => true, 'message' => 'User deleted successfully'];
    }
    
    public function getUserProjects($userId)
    {
        $sql = "SELECT p.* FROM projects p
                INNER JOIN project_users pu ON p.id = pu.project_id
                WHERE pu.user_id = ? AND p.deleted_at IS NULL
                ORDER BY p.created_at DESC";
        
        return $this->db->query($sql, [$userId]);
    }
}