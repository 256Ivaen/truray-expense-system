<?php

namespace App\Controllers;

use App\Services\AuditService;
use App\Services\SystemService;
use App\Utils\Response;
use App\Middleware\RoleMiddleware;

class AuditController
{
    private $auditService;
    private $systemService;

    public function __construct()
    {
        $this->auditService = new AuditService();
        $this->systemService = new SystemService();
    }

    public function getAuditLogs($data)
    {
        RoleMiddleware::requireRole(['admin', 'super_admin']);
        
        try {
            $page = isset($data['page']) ? (int)$data['page'] : 1;
            $perPage = isset($data['per_page']) ? (int)$data['per_page'] : 20;
            $filters = $data['filters'] ?? [];
            
            $result = $this->auditService->getAuditLogs($filters, $page, $perPage);
            
            Response::success('Audit logs retrieved successfully', $result);
        } catch (\Exception $e) {
            Response::error('Failed to retrieve audit logs: ' . $e->getMessage(), 500);
        }
    }

    public function getAuditDetails($data)
    {
        RoleMiddleware::requireRole(['admin', 'super_admin']);
        
        try {
            $auditId = $data['id'] ?? null;
            if (!$auditId) {
                Response::error('Audit ID is required', 400);
            }
            
            $audit = $this->auditService->getAuditDetails($auditId);
            
            if (!$audit) {
                Response::error('Audit log not found', 404);
            }
            
            Response::success('Audit details retrieved successfully', $audit);
        } catch (\Exception $e) {
            Response::error('Failed to retrieve audit details: ' . $e->getMessage(), 500);
        }
    }

    public function getRateLimits($data)
    {
        RoleMiddleware::requireRole(['admin', 'super_admin']);
        
        try {
            $page = isset($data['page']) ? (int)$data['page'] : 1;
            $perPage = isset($data['per_page']) ? (int)$data['per_page'] : 20;
            $filters = $data['filters'] ?? [];
            
            $result = $this->systemService->getRateLimits($filters, $page, $perPage);
            
            Response::success('Rate limits retrieved successfully', $result);
        } catch (\Exception $e) {
            Response::error('Failed to retrieve rate limits: ' . $e->getMessage(), 500);
        }
    }

    public function getSystemSeasons($data)
    {
        RoleMiddleware::requireRole(['admin', 'super_admin']);
        
        try {
            $page = isset($data['page']) ? (int)$data['page'] : 1;
            $perPage = isset($data['per_page']) ? (int)$data['per_page'] : 20;
            
            $result = $this->systemService->getSystemSeasons($page, $perPage);
            
            Response::success('System seasons retrieved successfully', $result);
        } catch (\Exception $e) {
            Response::error('Failed to retrieve system seasons: ' . $e->getMessage(), 500);
        }
    }

    public function searchAudit($data)
    {
        RoleMiddleware::requireRole(['admin', 'super_admin']);
        
        try {
            $query = $data['query'] ?? '';
            $type = $data['type'] ?? 'all';
            $page = isset($data['page']) ? (int)$data['page'] : 1;
            $perPage = isset($data['per_page']) ? (int)$data['per_page'] : 20;
            
            if (empty($query)) {
                Response::error('Search query is required', 400);
            }
            
            $result = $this->auditService->searchAudit($query, $type, $page, $perPage);
            
            Response::success('Audit search completed successfully', $result);
        } catch (\Exception $e) {
            Response::error('Failed to search audit: ' . $e->getMessage(), 500);
        }
    }

    public function getAuditStatistics($data)
    {
        RoleMiddleware::requireRole(['admin', 'super_admin']);
        
        try {
            $period = $data['period'] ?? '30d'; // 7d, 30d, 90d, 1y
            
            $stats = $this->auditService->getAuditStatistics($period);
            
            Response::success('Audit statistics retrieved successfully', $stats);
        } catch (\Exception $e) {
            Response::error('Failed to retrieve audit statistics: ' . $e->getMessage(), 500);
        }
    }

    public function getSystemMetrics($data)
    {
        RoleMiddleware::requireRole(['admin', 'super_admin']);
        
        try {
            $metrics = $this->systemService->getSystemMetrics();
            
            Response::success('System metrics retrieved successfully', $metrics);
        } catch (\Exception $e) {
            Response::error('Failed to retrieve system metrics: ' . $e->getMessage(), 500);
        }
    }
}