<?php

namespace App\Controllers;

use App\Services\DashboardService;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;

class DashboardController
{
    private $dashboardService;
    
    public function __construct()
    {
        $this->dashboardService = new DashboardService();
    }
    
    public function index($data)
    {
        $currentUser = AuthMiddleware::user();
        
        $dashboardData = $this->dashboardService->getDashboardData($currentUser);
        
        return Response::success($dashboardData);
    }
}