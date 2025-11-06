<?php

namespace App\Middleware;

use App\Utils\Response;

class RoleMiddleware
{
    public static function requireRole($allowedRoles)
    {
        $user = AuthMiddleware::user();
        
        if (!$user) {
            Response::unauthorized('Authentication required');
        }
        
        if (!is_array($allowedRoles)) {
            $allowedRoles = [$allowedRoles];
        }
        
        if (!in_array($user['role'], $allowedRoles)) {
            Response::forbidden('You do not have permission to access this resource');
        }
        
        return true;
    }
    
    public static function requireAdmin()
    {
        return self::requireRole('admin');
    }
    
    public static function requireFinanceAccess()
    {
        return self::requireRole(['admin']);
    }
    
    public static function canAccess($resourceUserId)
    {
        $user = AuthMiddleware::user();
        
        if (in_array($user['role'], ['admin'])) {
            return true;
        }
        
        if ($user['id'] === $resourceUserId) {
            return true;
        }
        
        Response::forbidden('You do not have permission to access this resource');
    }
}