<?php

namespace App\Controllers;

use App\Services\AuthService;
use App\Validators\AuthValidator;
use App\Utils\Response;
use App\Utils\Database;
use App\Middleware\AuditMiddleware;
use App\Middleware\AuthMiddleware;

class AuthController
{
    private $authService;
    private $db;
    
    public function __construct()
    {
        $this->authService = new AuthService();
        $this->db = Database::getInstance();
    }
    
    public function login($data)
    {
        $validator = new AuthValidator();
        $errors = $validator->validateLogin($data);
        
        if (!empty($errors)) {
            return Response::validationError($errors);
        }
        
        $result = $this->authService->login($data['email'], $data['password']);
        
        if ($result['success']) {
            AuditMiddleware::logLogin($result['data']['user']['id'], true);
            return Response::success($result['data'], 'Login successful');
        }
        
        AuditMiddleware::log('USER_LOGIN_FAILED', 'users', null);
        return Response::error($result['message'], 401);
    }
    
    public function register($data)
    {
        $validator = new AuthValidator();
        $errors = $validator->validateRegister($data);
        
        if (!empty($errors)) {
            return Response::validationError($errors);
        }
        
        $result = $this->authService->register($data);
        
        if ($result['success']) {
            return Response::success($result['data'], 'Registration successful', 201);
        }
        
        return Response::error($result['message'], 400);
    }
    
    public function logout($data)
    {
        $result = $this->authService->logout();
        
        if ($result['success']) {
            return Response::success(null, 'Logout successful');
        }
        
        return Response::error($result['message']);
    }
    
    public function refresh($data)
    {
        $result = $this->authService->refreshToken();
        
        if ($result['success']) {
            return Response::success($result['data'], 'Token refreshed');
        }
        
        return Response::error($result['message'], 401);
    }
    
    public function me($data)
    {
        $result = $this->authService->me();
        
        if ($result['success']) {
            return Response::success($result['data']);
        }
        
        return Response::error($result['message']);
    }
    
    public function forgotPassword($data)
    {
        $validator = new AuthValidator();
        $errors = $validator->validateEmail($data);
        
        if (!empty($errors)) {
            return Response::validationError($errors);
        }
        
        $result = $this->authService->forgotPassword($data['email']);
        
        return Response::success(null, 'Password reset instructions sent to your email');
    }
    
    public function resetPassword($data)
    {
        $validator = new AuthValidator();
        $errors = $validator->validatePasswordReset($data);
        
        if (!empty($errors)) {
            return Response::validationError($errors);
        }
        
        $result = $this->authService->resetPassword($data['token'], $data['password']);
        
        if ($result['success']) {
            return Response::success(null, 'Password reset successful');
        }
        
        return Response::error($result['message'], 400);
    }
    
    public function changePassword($data)
    {
        $currentUser = AuthMiddleware::user();
        
        if (empty($data['current_password'])) {
            return Response::error('Current password is required', 400);
        }
        
        if (empty($data['new_password'])) {
            return Response::error('New password is required', 400);
        }
        
        if (strlen($data['new_password']) < 6) {
            return Response::error('New password must be at least 6 characters', 400);
        }
        
        // Get user from database with password hash
        $user = $this->db->queryOne(
            "SELECT * FROM users WHERE id = ? AND deleted_at IS NULL",
            [$currentUser['id']]
        );
        
        if (!$user) {
            return Response::error('User not found', 404);
        }
        
        // Verify current password
        if (!password_verify($data['current_password'], $user['password_hash'])) {
            return Response::error('Current password is incorrect', 400);
        }
        
        // Hash new password
        $securityConfig = require BASE_PATH . '/config/security.php';
        $newPasswordHash = password_hash($data['new_password'], PASSWORD_BCRYPT, [
            'cost' => $securityConfig['bcrypt_rounds']
        ]);
        
        // Update password
        $this->db->execute(
            "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?",
            [$newPasswordHash, $currentUser['id']]
        );
        
        // Log the password change
        AuditMiddleware::log('CHANGE_PASSWORD', 'users', $currentUser['id']);
        
        return Response::success(null, 'Password changed successfully');
    }
}