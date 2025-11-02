<?php

namespace App\Controllers;

use App\Services\FinanceService;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;
use App\Middleware\AuditMiddleware;

class FinanceController
{
    private $financeService;
    
    public function __construct()
    {
        $this->financeService = new FinanceService();
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
        
        $result = $this->financeService->getAll($filters, $page, $perPage);
        
        return Response::paginated($result['data'], $result['total'], $result['page'], $result['per_page']);
    }
    
    public function show($data)
    {
        if (empty($data['id'])) {
            return Response::error('Finance ID is required', 400);
        }
        
        $finance = $this->financeService->getById($data['id']);
        
        if (!$finance) {
            return Response::notFound('Finance record not found');
        }
        
        return Response::success($finance);
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
        $data['deposited_by'] = $currentUser['id'];
        
        $result = $this->financeService->create($data);
        
        if ($result['success']) {
            AuditMiddleware::logCreate('finances', $result['data']['id'], $result['data']);
            return Response::success($result['data'], 'Deposit created successfully', 201);
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
        
        $result = $this->financeService->getByProject($data['id'], $page, $perPage);
        $total = $this->financeService->getTotalDeposits($data['id']);
        
        return Response::paginated($result['data'], $result['total'], $result['page'], $result['per_page'], 'Finances retrieved successfully');
    }
}