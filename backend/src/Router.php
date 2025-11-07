<?php

namespace App;

use App\Controllers\AuthController;
use App\Controllers\UserController;
use App\Controllers\ProjectController;
use App\Controllers\FinanceController;
use App\Controllers\AllocationController;
use App\Controllers\ExpenseController;
use App\Controllers\ReportController;
use App\Controllers\DashboardController;
use App\Controllers\NotificationController;
use App\Controllers\SearchController;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;
use App\Middleware\RateLimitMiddleware;
use App\Utils\Response;

class Router
{
    private $routes = [];
    
    public function __construct()
    {
        $this->defineRoutes();
    }
    
    private function defineRoutes()
    {
        $this->routes['POST']['/api/auth/login'] = [AuthController::class, 'login', false];
        $this->routes['POST']['/api/auth/register'] = [AuthController::class, 'register', false];
        $this->routes['POST']['/api/auth/forgot-password'] = [AuthController::class, 'forgotPassword', false];
        $this->routes['POST']['/api/auth/reset-password'] = [AuthController::class, 'resetPassword', false];
        
        $this->routes['POST']['/api/auth/logout'] = [AuthController::class, 'logout', true];
        $this->routes['POST']['/api/auth/refresh'] = [AuthController::class, 'refresh', true];
        $this->routes['GET']['/api/auth/me'] = [AuthController::class, 'me', true];
        
        $this->routes['GET']['/api/dashboard'] = [DashboardController::class, 'index', true];
        
        $this->routes['GET']['/api/users'] = [UserController::class, 'index', true, ['admin','super_admin']];
        $this->routes['GET']['/api/users/:id'] = [UserController::class, 'show', true];
        $this->routes['POST']['/api/users'] = [UserController::class, 'store', true, ['admin','super_admin']];
        $this->routes['PUT']['/api/users/:id'] = [UserController::class, 'update', true];
        $this->routes['DELETE']['/api/users/:id'] = [UserController::class, 'destroy', true, ['admin','super_admin']];
        
        $this->routes['GET']['/api/projects'] = [ProjectController::class, 'index', true];
        $this->routes['GET']['/api/projects/:id'] = [ProjectController::class, 'show', true];
        $this->routes['POST']['/api/projects'] = [ProjectController::class, 'store', true, ['admin','super_admin']];
        $this->routes['PUT']['/api/projects/:id'] = [ProjectController::class, 'update', true, ['admin','super_admin']];
        $this->routes['DELETE']['/api/projects/:id'] = [ProjectController::class, 'destroy', true, ['admin','super_admin']];
        $this->routes['POST']['/api/projects/:id/assign-user'] = [ProjectController::class, 'assignUser', true, ['admin','super_admin']];
        $this->routes['DELETE']['/api/projects/:id/remove-user/:userId'] = [ProjectController::class, 'removeUser', true, ['admin','super_admin']];
        
        $this->routes['GET']['/api/finances'] = [FinanceController::class, 'index', true, ['admin','super_admin']];
        $this->routes['GET']['/api/finances/system-balance'] = [FinanceController::class, 'systemBalance', true, ['admin','super_admin']];
        $this->routes['GET']['/api/finances/:id'] = [FinanceController::class, 'show', true, ['admin','super_admin']];
        $this->routes['POST']['/api/finances'] = [FinanceController::class, 'store', true, ['super_admin']];
        $this->routes['PUT']['/api/finances/:id'] = [FinanceController::class, 'update', true, ['super_admin']];
        $this->routes['DELETE']['/api/finances/:id'] = [FinanceController::class, 'destroy', true, ['super_admin']];
        $this->routes['GET']['/api/projects/:id/finances'] = [FinanceController::class, 'byProject', true];
        
        $this->routes['GET']['/api/allocations'] = [AllocationController::class, 'index', true];
        $this->routes['GET']['/api/allocations/:id'] = [AllocationController::class, 'show', true];
        $this->routes['POST']['/api/allocations'] = [AllocationController::class, 'store', true, ['super_admin']];
        $this->routes['PUT']['/api/allocations/:id'] = [AllocationController::class, 'update', true, ['super_admin']];
        $this->routes['GET']['/api/users/:id/allocations'] = [AllocationController::class, 'byUser', true];
        $this->routes['GET']['/api/projects/:id/allocations'] = [AllocationController::class, 'byProject', true];
        
        $this->routes['GET']['/api/expenses'] = [ExpenseController::class, 'index', true];
        $this->routes['GET']['/api/expenses/:id'] = [ExpenseController::class, 'show', true];
        $this->routes['POST']['/api/expenses'] = [ExpenseController::class, 'store', true];
        $this->routes['PUT']['/api/expenses/:id'] = [ExpenseController::class, 'update', true];
        $this->routes['DELETE']['/api/expenses/:id'] = [ExpenseController::class, 'destroy', true];
        $this->routes['POST']['/api/expenses/:id/approve'] = [ExpenseController::class, 'approve', true, ['super_admin']];
        $this->routes['POST']['/api/expenses/:id/reject'] = [ExpenseController::class, 'reject', true, ['super_admin']];
        $this->routes['GET']['/api/projects/:id/expenses'] = [ExpenseController::class, 'byProject', true];
        
        $this->routes['GET']['/api/reports/dashboard'] = [ReportController::class, 'dashboard', true];
        $this->routes['GET']['/api/reports/project-summary'] = [ReportController::class, 'projectSummary', true, ['admin','super_admin']];
        $this->routes['GET']['/api/reports/user-spending'] = [ReportController::class, 'userSpending', true, ['admin','super_admin']];
        $this->routes['GET']['/api/reports/financial-overview'] = [ReportController::class, 'financialOverview', true, ['admin','super_admin']];
        
        $this->routes['GET']['/api/notifications'] = [NotificationController::class, 'index', true];
        $this->routes['GET']['/api/notifications/unread'] = [NotificationController::class, 'unread', true];
        $this->routes['POST']['/api/notifications/:id/read'] = [NotificationController::class, 'markAsRead', true];
        $this->routes['POST']['/api/notifications/read-all'] = [NotificationController::class, 'markAllAsRead', true];

        $this->routes['GET']['/api/search'] = [SearchController::class, 'search', true];
    }
    
    public function dispatch($method, $uri, $data = [])
    {
        $route = $this->matchRoute($method, $uri);
        
        if (!$route) {
            Response::error('Route not found: ' . $method . ' ' . $uri, 404);
        }
        
        [$controller, $action, $requiresAuth, $roles, $params] = $route;
        
        if ($requiresAuth) {
            AuthMiddleware::authenticate();
            
            if (!empty($roles)) {
                RoleMiddleware::requireRole($roles);
            }
        }
        
        if ($method === 'POST' && strpos($uri, '/login') !== false) {
            RateLimitMiddleware::check('login');
        } else {
            RateLimitMiddleware::check('api');
        }
        
        $data = array_merge($data, $params);
        
        $controllerInstance = new $controller();
        $controllerInstance->$action($data);
    }
    
    private function matchRoute($method, $uri)
    {
        if (!isset($this->routes[$method])) {
            return null;
        }
        
        foreach ($this->routes[$method] as $pattern => $handler) {
            $regex = $this->patternToRegex($pattern);
            
            if (preg_match($regex, $uri, $matches)) {
                array_shift($matches);
                
                $params = $this->extractParams($pattern, $matches);
                
                return [
                    $handler[0],
                    $handler[1],
                    $handler[2] ?? false,
                    $handler[3] ?? [],
                    $params
                ];
            }
        }
        
        return null;
    }
    
    private function patternToRegex($pattern)
    {
        $pattern = preg_replace('/\/:([^\/]+)/', '/([^/]+)', $pattern);
        return '#^' . $pattern . '$#';
    }
    
    private function extractParams($pattern, $matches)
    {
        preg_match_all('/:([^\/]+)/', $pattern, $paramNames);
        $paramNames = $paramNames[1];
        
        $params = [];
        foreach ($paramNames as $index => $name) {
            if (isset($matches[$index])) {
                $params[$name] = $matches[$index];
            }
        }
        
        return $params;
    }
}