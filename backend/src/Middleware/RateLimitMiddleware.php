<?php

namespace App\Middleware;

use App\Utils\Response;
use App\Utils\Database;

class RateLimitMiddleware
{
    private static $limits = [
        'login' => ['max' => 5, 'window' => 900],
        'api' => ['max' => 60, 'window' => 60],
        'upload' => ['max' => 10, 'window' => 300]
    ];
    
    public static function check($type = 'api')
    {
        $limit = self::$limits[$type] ?? self::$limits['api'];
        $identifier = self::getIdentifier();
        $key = "{$type}:{$identifier}";
        
        $db = Database::getInstance();
        $now = time();
        $windowStart = $now - $limit['window'];
        
        $db->execute(
            "DELETE FROM rate_limits WHERE identifier = ? AND created_at < FROM_UNIXTIME(?)",
            [$key, $windowStart]
        );
        
        $count = $db->queryOne(
            "SELECT COUNT(*) as count FROM rate_limits WHERE identifier = ?",
            [$key]
        );
        
        $currentCount = $count['count'] ?? 0;
        
        if ($currentCount >= $limit['max']) {
            Response::error('Rate limit exceeded. Please try again later.', 429);
        }
        
        $db->execute(
            "INSERT INTO rate_limits (id, identifier, created_at) VALUES (UUID(), ?, FROM_UNIXTIME(?))",
            [$key, $now]
        );
        
        return true;
    }
    
    private static function getIdentifier()
    {
        $ip = self::getClientIP();
        
        $user = AuthMiddleware::user();
        if ($user) {
            return $ip . ':' . $user['id'];
        }
        
        return $ip;
    }
    
    private static function getClientIP()
    {
        $headers = [
            'HTTP_CF_CONNECTING_IP',
            'HTTP_X_REAL_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_CLIENT_IP',
            'REMOTE_ADDR'
        ];
        
        foreach ($headers as $header) {
            if (isset($_SERVER[$header]) && filter_var($_SERVER[$header], FILTER_VALIDATE_IP)) {
                return $_SERVER[$header];
            }
        }
        
        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }
}