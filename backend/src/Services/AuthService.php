<?php

namespace App\Services;

use App\Models\User;
use App\Utils\JWTHandler;
use App\Utils\Database;
use App\Middleware\AuthMiddleware;
use Ramsey\Uuid\Uuid;

class AuthService
{
    private $userModel;
    private $jwtHandler;
    private $db;
    private $securityConfig;
    
    public function __construct()
    {
        $this->userModel = new User();
        $this->jwtHandler = new JWTHandler();
        $this->db = Database::getInstance();
        $this->securityConfig = require BASE_PATH . '/config/security.php';
    }
    
    public function login($email, $password)
    {
        $user = $this->db->queryOne(
            "SELECT * FROM users WHERE email = ? AND deleted_at IS NULL",
            [$email]
        );
        
        if (!$user) {
            return ['success' => false, 'message' => 'Invalid credentials'];
        }
        
        if ($user['status'] !== 'active') {
            return ['success' => false, 'message' => 'Account is not active'];
        }
        
        if ($user['account_locked_until'] && strtotime($user['account_locked_until']) > time()) {
            return ['success' => false, 'message' => 'Account is temporarily locked'];
        }
        
        if (!password_verify($password, $user['password_hash'])) {
            $failedAttempts = $user['failed_login_attempts'] + 1;
            
            $lockUntil = null;
            if ($failedAttempts >= $this->securityConfig['max_login_attempts']) {
                $lockUntil = date('Y-m-d H:i:s', time() + $this->securityConfig['lockout_time']);
            }
            
            $this->db->execute(
                "UPDATE users SET failed_login_attempts = ?, account_locked_until = ? WHERE id = ?",
                [$failedAttempts, $lockUntil, $user['id']]
            );
            
            return ['success' => false, 'message' => 'Invalid credentials'];
        }
        
        $this->db->execute(
            "UPDATE users SET failed_login_attempts = 0, account_locked_until = NULL, last_login = NOW() WHERE id = ?",
            [$user['id']]
        );
        
        $token = $this->jwtHandler->generate($user['id'], $user['email'], $user['role']);
        $refreshToken = $this->jwtHandler->generateRefreshToken($user['id']);
        
        $tokenHash = JWTHandler::hashToken($token);
        $expiresAt = date('Y-m-d H:i:s', time() + (require BASE_PATH . '/config/jwt.php')['expiration']);
        
        $this->db->execute(
            "INSERT INTO sessions (id, user_id, token_hash, ip_address, user_agent, expires_at) 
             VALUES (?, ?, ?, ?, ?, ?)",
            [
                Uuid::uuid4()->toString(),
                $user['id'],
                $tokenHash,
                $_SERVER['REMOTE_ADDR'] ?? null,
                $_SERVER['HTTP_USER_AGENT'] ?? null,
                $expiresAt
            ]
        );
        
        unset($user['password_hash']);
        unset($user['password_reset_token']);
        unset($user['email_verification_token']);
        
        return [
            'success' => true,
            'data' => [
                'token' => $token,
                'refresh_token' => $refreshToken,
                'user' => $user
            ]
        ];
    }
    
    public function register($data)
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
            "INSERT INTO users (id, email, password_hash, first_name, last_name, phone, role) 
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                $userId,
                $data['email'],
                $passwordHash,
                $data['first_name'],
                $data['last_name'],
                $data['phone'] ?? null,
                $data['role'] ?? 'user'
            ]
        );
        
        $user = $this->userModel->find($userId);
        
        return ['success' => true, 'data' => $user];
    }
    
    public function logout()
    {
        $token = JWTHandler::extractToken();
        if ($token) {
            $tokenHash = JWTHandler::hashToken($token);
            $this->db->execute(
                "DELETE FROM sessions WHERE token_hash = ?",
                [$tokenHash]
            );
        }
        
        return ['success' => true];
    }
    
    public function refreshToken()
    {
        $user = AuthMiddleware::user();
        if (!$user) {
            return ['success' => false, 'message' => 'User not authenticated'];
        }
        
        $token = $this->jwtHandler->generate($user['id'], $user['email'], $user['role']);
        
        return ['success' => true, 'data' => ['token' => $token]];
    }
    
    public function me()
    {
        $user = AuthMiddleware::user();
        if (!$user) {
            return ['success' => false, 'message' => 'User not authenticated'];
        }
        
        return ['success' => true, 'data' => $user];
    }
    
    public function forgotPassword($email)
    {
        $user = $this->db->queryOne(
            "SELECT id FROM users WHERE email = ? AND deleted_at IS NULL",
            [$email]
        );
        
        if ($user) {
            $token = bin2hex(random_bytes(32));
            $expires = date('Y-m-d H:i:s', time() + 3600);
            
            $this->db->execute(
                "UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?",
                [$token, $expires, $user['id']]
            );
        }
        
        return ['success' => true];
    }
    
    public function resetPassword($token, $password)
    {
        $user = $this->db->queryOne(
            "SELECT id FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()",
            [$token]
        );
        
        if (!$user) {
            return ['success' => false, 'message' => 'Invalid or expired reset token'];
        }
        
        $passwordHash = password_hash($password, PASSWORD_BCRYPT, [
            'cost' => $this->securityConfig['bcrypt_rounds']
        ]);
        
        $this->db->execute(
            "UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?",
            [$passwordHash, $user['id']]
        );
        
        return ['success' => true];
    }
}