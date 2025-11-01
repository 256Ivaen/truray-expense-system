<?php

namespace App\Controllers;

use App\Services\AuthService;
use App\Validators\AuthValidator;
use App\Utils\Response;
use App\Middleware\AuditMiddleware;

class AuthController
{
    private $authService;
    
    public function __construct()
    {
        $this->authService = new AuthService();
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
}