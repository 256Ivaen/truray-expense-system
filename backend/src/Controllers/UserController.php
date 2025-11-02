<?php

namespace App\Controllers;

use App\Services\UserService;
use App\Validators\UserValidator;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;
use App\Middleware\AuditMiddleware;

class UserController
{
    private $userService;
    
    public function __construct()
    {
        $this->userService = new UserService();
    }
    
    public function index($data)
    {
        $filters = [];
        
        if (isset($data['role'])) {
            $filters['role'] = $data['role'];
        }
        
        if (isset($data['status'])) {
            $filters['status'] = $data['status'];
        }
        
        $page = isset($data['page']) ? max(1, (int)$data['page']) : 1;
        $perPage = isset($data['per_page']) ? max(1, (int)$data['per_page']) : 5;
        
        $result = $this->userService->getAll($filters, $page, $perPage);
        
        return Response::paginated($result['data'], $result['total'], $result['page'], $result['per_page']);
    }
    
    public function show($data)
    {
        if (empty($data['id'])) {
            return Response::error('User ID is required', 400);
        }
        
        $user = $this->userService->getById($data['id']);
        
        if (!$user) {
            return Response::notFound('User not found');
        }
        
        $currentUser = AuthMiddleware::user();
        
        if ($currentUser['role'] !== 'admin' && $currentUser['id'] !== $user['id']) {
            return Response::forbidden('You can only view your own profile');
        }
        
        return Response::success($user);
    }
    
    public function store($data)
    {
        $validator = new UserValidator();
        $errors = $validator->validateCreate($data);
        
        if (!empty($errors)) {
            return Response::validationError($errors);
        }
        
        $currentUser = AuthMiddleware::user();
        $data['created_by'] = $currentUser['id'];
        
        $result = $this->userService->create($data);
        
        if ($result['success']) {
            AuditMiddleware::logCreate('users', $result['data']['id'], $result['data']);
            return Response::success($result['data'], 'User created successfully', 201);
        }
        
        return Response::error($result['message'], 400);
    }
    
    public function update($data)
    {
        if (empty($data['id'])) {
            return Response::error('User ID is required', 400);
        }
        
        $validator = new UserValidator();
        $errors = $validator->validateUpdate($data);
        
        if (!empty($errors)) {
            return Response::validationError($errors);
        }
        
        $currentUser = AuthMiddleware::user();
        
        if ($currentUser['role'] !== 'admin' && $currentUser['id'] !== $data['id']) {
            return Response::forbidden('You can only update your own profile');
        }
        
        $oldUser = $this->userService->getById($data['id']);
        
        $result = $this->userService->update($data['id'], $data);
        
        if ($result['success']) {
            AuditMiddleware::logUpdate('users', $data['id'], $oldUser, $result['data']);
            return Response::success($result['data'], 'User updated successfully');
        }
        
        return Response::error($result['message'], 400);
    }
    
    public function destroy($data)
    {
        if (empty($data['id'])) {
            return Response::error('User ID is required', 400);
        }
        
        $user = $this->userService->getById($data['id']);
        
        if (!$user) {
            return Response::notFound('User not found');
        }
        
        $currentUser = AuthMiddleware::user();
        
        if ($currentUser['id'] === $data['id']) {
            return Response::error('You cannot delete your own account', 400);
        }
        
        $result = $this->userService->delete($data['id']);
        
        if ($result['success']) {
            AuditMiddleware::logDelete('users', $data['id'], $user);
            return Response::success(null, $result['message']);
        }
        
        return Response::error($result['message'], 400);
    }
}