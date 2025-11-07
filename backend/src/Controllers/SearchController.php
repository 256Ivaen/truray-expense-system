<?php

namespace App\Controllers;

use App\Services\SearchService;
use App\Utils\Response;
use App\Middleware\AuthMiddleware;

class SearchController
{
    private $searchService;
    
    public function __construct()
    {
        $this->searchService = new SearchService();
    }
    
    public function search($data)
    {
        $query = $_GET['q'] ?? '';
        $type = $_GET['type'] ?? 'all';
        $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
        $perPage = isset($_GET['per_page']) ? max(1, (int)$_GET['per_page']) : 10;
        
        if (empty($query)) {
            return Response::error('Search query is required', 400);
        }
        
        $currentUser = AuthMiddleware::user();
        $userRole = $currentUser['role'] ?? 'user';
        
        if ($type === 'users' && $userRole !== 'admin') {
            return Response::error('Unauthorized to search users', 403);
        }
        
        $result = $this->searchService->search($query, $type, $userRole, $currentUser['id'], $page, $perPage);
        
        return Response::paginated($result['data'], $result['total'], $result['page'], $result['per_page']);
    }
}