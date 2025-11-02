<?php

namespace App\Controllers;

use App\Services\ProjectService;
use App\Validators\ProjectValidator;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;
use App\Middleware\AuditMiddleware;

class ProjectController
{
    private $projectService;
    
    public function __construct()
    {
        $this->projectService = new ProjectService();
    }
    
    public function index($data)
    {
        $currentUser = AuthMiddleware::user();
        
        $page = isset($data['page']) ? max(1, (int)$data['page']) : 1;
        $perPage = isset($data['per_page']) ? max(1, (int)$data['per_page']) : 5;
        
        $result = $this->projectService->getAll($currentUser['id'], $currentUser['role'], $page, $perPage);
        
        return Response::paginated($result['data'], $result['total'], $result['page'], $result['per_page']);
    }
    
    public function show($data)
    {
        if (empty($data['id'])) {
            return Response::error('Project ID is required', 400);
        }
        
        $currentUser = AuthMiddleware::user();
        
        $project = $this->projectService->getById($data['id'], $currentUser['id'], $currentUser['role']);
        
        if (!$project) {
            return Response::notFound('Project not found');
        }
        
        // Get users assigned to the project
        $users = $this->projectService->getProjectUsers($data['id']);
        $project['users'] = $users;
        
        return Response::success($project);
    }
    
    public function store($data)
    {
        $validator = new ProjectValidator();
        $errors = $validator->validateCreate($data);
        
        if (!empty($errors)) {
            return Response::validationError($errors);
        }
        
        $currentUser = AuthMiddleware::user();
        $data['created_by'] = $currentUser['id'];
        
        $result = $this->projectService->create($data);
        
        if ($result['success']) {
            AuditMiddleware::logCreate('projects', $result['data']['id'], $result['data']);
            return Response::success($result['data'], 'Project created successfully', 201);
        }
        
        return Response::error($result['message'], 400);
    }
    
    public function update($data)
    {
        if (empty($data['id'])) {
            return Response::error('Project ID is required', 400);
        }
        
        $validator = new ProjectValidator();
        $errors = $validator->validateUpdate($data);
        
        if (!empty($errors)) {
            return Response::validationError($errors);
        }
        
        $currentUser = AuthMiddleware::user();
        
        // Use the same method with user context to check permissions
        $oldProject = $this->projectService->getById($data['id'], $currentUser['id'], $currentUser['role']);
        
        if (!$oldProject) {
            return Response::notFound('Project not found');
        }
        
        $result = $this->projectService->update($data['id'], $data);
        
        if ($result['success']) {
            AuditMiddleware::logUpdate('projects', $data['id'], $oldProject, $result['data']);
            return Response::success($result['data'], 'Project updated successfully');
        }
        
        return Response::error($result['message'], 400);
    }
    
    public function destroy($data)
    {
        if (empty($data['id'])) {
            return Response::error('Project ID is required', 400);
        }
        
        $currentUser = AuthMiddleware::user();
        
        // Use the same method with user context to check permissions
        $project = $this->projectService->getById($data['id'], $currentUser['id'], $currentUser['role']);
        
        if (!$project) {
            return Response::notFound('Project not found');
        }
        
        $result = $this->projectService->delete($data['id']);
        
        if ($result['success']) {
            AuditMiddleware::logDelete('projects', $data['id'], $project);
            return Response::success(null, $result['message']);
        }
        
        return Response::error($result['message'], 400);
    }
    
    public function assignUser($data)
    {
        if (empty($data['id']) || empty($data['user_id'])) {
            return Response::error('Project ID and User ID are required', 400);
        }
        
        $currentUser = AuthMiddleware::user();
        
        // Check if project exists and user has permission
        $project = $this->projectService->getById($data['id'], $currentUser['id'], $currentUser['role']);
        if (!$project) {
            return Response::notFound('Project not found');
        }
        
        $result = $this->projectService->assignUser($data['id'], $data['user_id'], $currentUser['id']);
        
        if ($result['success']) {
            AuditMiddleware::log('ASSIGN_USER_TO_PROJECT', 'project_users', null, null, [
                'project_id' => $data['id'],
                'user_id' => $data['user_id']
            ]);
            return Response::success(null, $result['message']);
        }
        
        return Response::error($result['message'], 400);
    }
    
    public function removeUser($data)
    {
        if (empty($data['id']) || empty($data['userId'])) {
            return Response::error('Project ID and User ID are required', 400);
        }
        
        $currentUser = AuthMiddleware::user();
        
        // Check if project exists and user has permission
        $project = $this->projectService->getById($data['id'], $currentUser['id'], $currentUser['role']);
        if (!$project) {
            return Response::notFound('Project not found');
        }
        
        $result = $this->projectService->removeUser($data['id'], $data['userId']);
        
        if ($result['success']) {
            AuditMiddleware::log('REMOVE_USER_FROM_PROJECT', 'project_users', null, [
                'project_id' => $data['id'],
                'user_id' => $data['userId']
            ], null);
            return Response::success(null, $result['message']);
        }
        
        return Response::error($result['message'], 400);
    }
}