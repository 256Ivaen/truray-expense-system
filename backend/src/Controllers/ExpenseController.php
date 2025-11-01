<?php

namespace App\Controllers;

use App\Services\ExpenseService;
use App\Validators\ExpenseValidator;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;
use App\Middleware\AuditMiddleware;

class ExpenseController
{
    private $expenseService;
    
    public function __construct()
    {
        $this->expenseService = new ExpenseService();
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
        
        $expenses = $this->expenseService->getAll($filters);
        
        return Response::success($expenses);
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
        
        $expenses = $this->expenseService->byProject($data['id']);
        
        return Response::success($expenses);
    }
}