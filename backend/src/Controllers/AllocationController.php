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
        $filters = [];
        
        if (isset($data['project_id'])) {
            $filters['project_id'] = $data['project_id'];
        }
        
        if (isset($data['status'])) {
            $filters['status'] = $data['status'];
        }
        
        $page = isset($data['page']) ? max(1, (int)$data['page']) : 1;
        $perPage = isset($data['per_page']) ? max(1, (int)$data['per_page']) : 5;
        
        $result = $this->allocationService->getAll($filters, $page, $perPage);
        
        return Response::paginated($result['data'], $result['total'], $result['page'], $result['per_page']);
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
        
        return Response::success($allocation);
    }
    
    public function store($data)
    {
        if (empty($data['project_id'])) {
            return Response::error('Project ID is required', 400);
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
    
    public function delete($data)
    {
        if (empty($data['id'])) {
            return Response::error('Allocation ID is required', 400);
        }
        
        $result = $this->allocationService->delete($data['id']);
        
        if ($result['success']) {
            AuditMiddleware::logDelete('allocations', $data['id']);
            return Response::success(null, $result['message']);
        }
        
        return Response::error($result['message'], 400);
    }
    
    public function byProject($data)
    {
        if (empty($data['id'])) {
            return Response::error('Project ID is required', 400);
        }
        
        $page = isset($data['page']) ? max(1, (int)$data['page']) : 1;
        $perPage = isset($data['per_page']) ? max(1, (int)$data['per_page']) : 5;
        
        $result = $this->allocationService->getByProject($data['id'], $page, $perPage);
        
        return Response::paginated($result['data'], $result['total'], $result['page'], $result['per_page']);
    }
    
    public function systemBalance($data)
    {
        $balance = $this->allocationService->getSystemBalance();
        return Response::success($balance);
    }
    
    public function projectBalance($data)
    {
        if (empty($data['id'])) {
            return Response::error('Project ID is required', 400);
        }
        
        $balance = $this->allocationService->getProjectAllocation($data['id']);
        return Response::success($balance);
    }
}