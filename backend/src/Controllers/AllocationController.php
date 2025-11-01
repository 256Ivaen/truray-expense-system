<?php

namespace App\Controllers;

use App\Services\AllocationService;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;
use App\Middleware\AuditMiddleware;

class AllocationController
{
    private $allocationService;
    
    public function __construct()
    {
        $this->allocationService = new AllocationService();
    }
    
    public function index($data)
    {
        $currentUser = AuthMiddleware::user();
        
        $filters = [];
        
        if ($currentUser['role'] === 'user') {
            $filters['user_id'] = $currentUser['id'];
        }
        
        if (isset($data['project_id'])) {
            $filters['project_id'] = $data['project_id'];
        }
        
        if (isset($data['status'])) {
            $filters['status'] = $data['status'];
        }
        
        $allocations = $this->allocationService->getAll($filters);
        
        return Response::success($allocations);
    }
    
    public function show($data)
    {
        if (empty($data['id'])) {
            return Response::error('Allocation ID is required', 400);
        }
        
        $allocation = $this->allocationService->getById($data['id']);
        
        if (!$allocation) {
            return Response::notFound('Allocation not found');
        }
        
        $currentUser = AuthMiddleware::user();
        
        if ($currentUser['role'] === 'user' && $allocation['user_id'] !== $currentUser['id']) {
            return Response::forbidden('You can only view your own allocations');
        }
        
        return Response::success($allocation);
    }
    
    public function store($data)
    {
        if (empty($data['project_id'])) {
            return Response::error('Project ID is required', 400);
        }
        
        if (empty($data['user_id'])) {
            return Response::error('User ID is required', 400);
        }
        
        if (empty($data['amount']) || !is_numeric($data['amount']) || $data['amount'] <= 0) {
            return Response::error('Valid amount greater than 0 is required', 400);
        }
        
        $currentUser = AuthMiddleware::user();
        $data['allocated_by'] = $currentUser['id'];
        
        $result = $this->allocationService->create($data, $_FILES);
        
        if ($result['success']) {
            AuditMiddleware::logCreate('allocations', $result['data']['id'], $result['data']);
            return Response::success($result['data'], 'Allocation created successfully', 201);
        }
        
        return Response::error($result['message'], 400);
    }
    
    public function update($data)
    {
        if (empty($data['id'])) {
            return Response::error('Allocation ID is required', 400);
        }
        
        $oldAllocation = $this->allocationService->getById($data['id']);
        
        if (!$oldAllocation) {
            return Response::notFound('Allocation not found');
        }
        
        $result = $this->allocationService->update($data['id'], $data, $_FILES);
        
        if ($result['success']) {
            AuditMiddleware::logUpdate('allocations', $data['id'], $oldAllocation, $result['data']);
            return Response::success($result['data'], 'Allocation updated successfully');
        }
        
        return Response::error($result['message'], 400);
    }
    
    public function byUser($data)
    {
        if (empty($data['id'])) {
            return Response::error('User ID is required', 400);
        }
        
        $currentUser = AuthMiddleware::user();
        
        if ($currentUser['role'] === 'user' && $data['id'] !== $currentUser['id']) {
            return Response::forbidden('You can only view your own allocations');
        }
        
        $allocations = $this->allocationService->getByUser($data['id']);
        
        return Response::success($allocations);
    }
    
    public function byProject($data)
    {
        if (empty($data['id'])) {
            return Response::error('Project ID is required', 400);
        }
        
        $allocations = $this->allocationService->getByProject($data['id']);
        
        return Response::success($allocations);
    }
}