<?php

namespace App\Controllers;

use App\Services\NotificationService;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;

class NotificationController
{
    private $notificationService;
    
    public function __construct()
    {
        $this->notificationService = new NotificationService();
    }
    
    public function index($data)
    {
        $currentUser = AuthMiddleware::user();
        
        $page = isset($data['page']) ? max(1, (int)$data['page']) : 1;
        $perPage = isset($data['per_page']) ? max(1, (int)$data['per_page']) : 5;
        
        $result = $this->notificationService->getAll($currentUser['id'], $page, $perPage);
        
        return Response::paginated($result['data'], $result['total'], $result['page'], $result['per_page']);
    }
    
    public function unread($data)
    {
        $currentUser = AuthMiddleware::user();
        
        $count = $this->notificationService->getUnread($currentUser['id']);
        
        return Response::success(['count' => $count]);
    }
    
    public function markAsRead($data)
    {
        if (empty($data['id'])) {
            return Response::error('Notification ID is required', 400);
        }
        
        $currentUser = AuthMiddleware::user();
        
        $result = $this->notificationService->markAsRead($data['id'], $currentUser['id']);
        
        if ($result['success']) {
            return Response::success(null, $result['message']);
        }
        
        return Response::error($result['message'], 400);
    }
    
    public function markAllAsRead($data)
    {
        $currentUser = AuthMiddleware::user();
        
        $result = $this->notificationService->markAllAsRead($currentUser['id']);
        
        return Response::success(null, $result['message']);
    }
}

