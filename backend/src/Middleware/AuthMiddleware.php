<?php

namespace App\Middleware;

use App\Utils\JWTHandler;
use App\Utils\Response;
use App\Utils\Database;
use Exception;

class AuthMiddleware
{
    public static function authenticate()
    {
        try {
            $token = JWTHandler::extractToken();
            
            if (!$token) {
                Response::unauthorized('Authentication token required');
            }
            
            $jwtHandler = new JWTHandler();
            $decoded = $jwtHandler->validate($token);
            
            $tokenHash = JWTHandler::hashToken($token);
            $db = Database::getInstance();
            
            $session = $db->queryOne(
                "SELECT * FROM sessions WHERE token_hash = ? AND expires_at > NOW()",
                [$tokenHash]
            );
            
            if (!$session) {
                Response::unauthorized('Invalid or expired token');
            }
            
            $user = $db->queryOne(
                "SELECT id, email, first_name, last_name, role, status 
                 FROM users 
                 WHERE id = ? AND deleted_at IS NULL",
                [$decoded['sub']]
            );
            
            if (!$user) {
                Response::unauthorized('User not found');
            }
            
            if ($user['status'] !== 'active') {
                Response::unauthorized('Account is not active');
            }
            
            $GLOBALS['auth_user'] = $user;
            
            return $user;
            
        } catch (Exception $e) {
            Response::unauthorized($e->getMessage());
        }
    }
    
    public static function user()
    {
        return $GLOBALS['auth_user'] ?? null;
    }
}