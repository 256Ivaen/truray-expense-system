<?php

namespace App\Controllers;

use App\Services\ExpenseService;
use App\Services\AllocationService;
use App\Validators\ExpenseValidator;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;
use App\Middleware\AuditMiddleware;

class ExpenseController
{
    private $expenseService;
    private $allocationService;
    
    public function __construct()
    {
        $this->expenseService = new ExpenseService();
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
        
        $page = isset($data['page']) ? max(1, (int)$data['page']) : 1;
        $perPage = isset($data['per_page']) ? max(1, (int)$data['per_page']) : 5;
        
        $result = $this->expenseService->getAll($filters, $page, $perPage);
        
        // Get allocation summary for the main cards
        $allocationSummary = $this->getAllocationSummary($filters);
        $result['allocation_summary'] = $allocationSummary;
        
        // Add detailed summary for admin and super admin users
        if (in_array($currentUser['role'], ['admin', 'super_admin'])) {
            $expenseSummary = $this->expenseService->getExpenseSummary($filters);
            $result['expense_summary'] = $expenseSummary;
        }
        
        return Response::paginated(
            $result['data'], 
            $result['total'], 
            $result['page'], 
            $result['per_page'], 
            $result['allocation_summary'],
            $result['expense_summary'] ?? null
        );
    }
    
    public function show($data)
    {
        if (empty($data['id'])) {
            return Response::error('Expense ID is required', 400);
        }
        
        $expense = $this->expenseService->getById($data['id']);
        
        if (!$expense) {
            return Response::notFound('Expense not found');
        }
        
        $currentUser = AuthMiddleware::user();
        
        if ($currentUser['role'] === 'user' && $expense['user_id'] !== $currentUser['id']) {
            return Response::forbidden('You can only view your own expenses');
        }
        
        return Response::success($expense);
    }
    
    public function store($data)
    {
        $validator = new ExpenseValidator();
        $errors = $validator->validateCreate($data);
        
        if (!empty($errors)) {
            return Response::validationError($errors);
        }
        
        $currentUser = AuthMiddleware::user();
        $data['user_id'] = $currentUser['id'];
        
        $result = $this->expenseService->create($data, $_FILES);
        
        if ($result['success']) {
            AuditMiddleware::logCreate('expenses', $result['data']['id'], $result['data']);
            return Response::success($result['data'], 'Expense created successfully', 201);
        }
        
        return Response::error($result['message'], 400);
    }
    
    public function update($data)
    {
        if (empty($data['id'])) {
            return Response::error('Expense ID is required', 400);
        }
        
        $validator = new ExpenseValidator();
        $errors = $validator->validateUpdate($data);
        
        if (!empty($errors)) {
            return Response::validationError($errors);
        }
        
        $expense = $this->expenseService->getById($data['id']);
        
        if (!$expense) {
            return Response::notFound('Expense not found');
        }
        
        $currentUser = AuthMiddleware::user();
        
        if ($currentUser['role'] === 'user' && $expense['user_id'] !== $currentUser['id']) {
            return Response::forbidden('You can only update your own expenses');
        }
        
        $oldExpense = $expense;
        
        $result = $this->expenseService->update($data['id'], $data, $_FILES);
        
        if ($result['success']) {
            AuditMiddleware::logUpdate('expenses', $data['id'], $oldExpense, $result['data']);
            return Response::success($result['data'], 'Expense updated successfully');
        }
        
        return Response::error($result['message'], 400);
    }
    
    public function destroy($data)
    {
        if (empty($data['id'])) {
            return Response::error('Expense ID is required', 400);
        }
        
        $expense = $this->expenseService->getById($data['id']);
        
        if (!$expense) {
            return Response::notFound('Expense not found');
        }
        
        $currentUser = AuthMiddleware::user();
        
        if ($currentUser['role'] === 'user' && $expense['user_id'] !== $currentUser['id']) {
            return Response::forbidden('You can only delete your own expenses');
        }
        
        $result = $this->expenseService->delete($data['id']);
        
        if ($result['success']) {
            AuditMiddleware::logDelete('expenses', $data['id'], $expense);
            return Response::success(null, $result['message']);
        }
        
        return Response::error($result['message'], 400);
    }
    
    public function approve($data)
    {
        if (empty($data['id'])) {
            return Response::error('Expense ID is required', 400);
        }
        
        $currentUser = AuthMiddleware::user();
        
        $result = $this->expenseService->approve($data['id'], $currentUser['id']);
        
        if ($result['success']) {
            AuditMiddleware::log('APPROVE_EXPENSE', 'expenses', $data['id']);
            return Response::success($result['data'], 'Expense approved successfully');
        }
        
        return Response::error($result['message'], 400);
    }
    
    public function reject($data)
    {
        if (empty($data['id'])) {
            return Response::error('Expense ID is required', 400);
        }
        
        $currentUser = AuthMiddleware::user();
        
        $result = $this->expenseService->reject($data['id'], $currentUser['id']);
        
        if ($result['success']) {
            AuditMiddleware::log('REJECT_EXPENSE', 'expenses', $data['id']);
            return Response::success($result['data'], 'Expense rejected successfully');
        }
        
        return Response::error($result['message'], 400);
    }
    
    public function byProject($data)
    {
        if (empty($data['id'])) {
            return Response::error('Project ID is required', 400);
        }
        
        $currentUser = AuthMiddleware::user();
        
        $page = isset($data['page']) ? max(1, (int)$data['page']) : 1;
        $perPage = isset($data['per_page']) ? max(1, (int)$data['per_page']) : 5;
        
        $filters = ['project_id' => $data['id']];
        
        // For regular users, only show their own expenses
        if ($currentUser['role'] === 'user') {
            $filters['user_id'] = $currentUser['id'];
        }
        
        $result = $this->expenseService->getAll($filters, $page, $perPage);
        
        // Get allocation summary for the main cards
        $allocationSummary = $this->getAllocationSummary($filters);
        $result['allocation_summary'] = $allocationSummary;
        
        // Add detailed summary for admin and super admin users
        if (in_array($currentUser['role'], ['admin', 'super_admin'])) {
            $expenseSummary = $this->expenseService->getExpenseSummary($filters);
            $result['expense_summary'] = $expenseSummary;
        }
        
        return Response::paginated(
            $result['data'], 
            $result['total'], 
            $result['page'], 
            $result['per_page'], 
            $result['allocation_summary'],
            $result['expense_summary'] ?? null
        );
    }
    
    private function getAllocationSummary($filters = [])
    {
        // If project_id filter is set, get project-specific allocation data
        if (isset($filters['project_id'])) {
            $projectAllocation = $this->allocationService->getProjectAllocation($filters['project_id']);
            
            return [
                'total_allocated' => $projectAllocation['total_allocated'] ?? '0.00',
                'total_expenses' => $projectAllocation['total_spent'] ?? '0.00',
                'allocation_balance' => $projectAllocation['remaining_balance'] ?? '0.00'
            ];
        }
        
        // If user_id filter is set (normal user), get their project allocations
        if (isset($filters['user_id'])) {
            return $this->expenseService->getUserAllocationSummary($filters['user_id']);
        }
        
        // For admin viewing all expenses without project filter, get system-wide data
        return $this->expenseService->getSystemAllocationSummary();
    }
}