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
        $query = $data['q'] ?? '';
        $type = $data['type'] ?? 'all'; 
        $page = isset($data['page']) ? max(1, (int)$data['page']) : 1;
        $perPage = isset($data['per_page']) ? max(1, (int)$data['per_page']) : 10;
        
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