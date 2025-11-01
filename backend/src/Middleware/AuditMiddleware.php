<?php

namespace App\Middleware;

use App\Utils\Database;
use App\Utils\Logger;

class AuditMiddleware
{
    public static function log($action, $tableName = null, $recordId = null, $oldValues = null, $newValues = null)
    {
        try {
            $user = AuthMiddleware::user();
            $userId = $user['id'] ?? null;
            
            $db = Database::getInstance();
            
            $ipAddress = self::getClientIP();
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
            
            $db->execute(
                "INSERT INTO audit_logs (
                    id, user_id, action, table_name, record_id, 
                    old_values, new_values, ip_address, user_agent
                ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    $userId,
                    $action,
                    $tableName,
                    $recordId,
                    $oldValues ? json_encode($oldValues) : null,
                    $newValues ? json_encode($newValues) : null,
                    $ipAddress,
                    $userAgent
                ]
            );
            
            Logger::getInstance()->audit($action, [
                'user_id' => $userId,
                'table' => $tableName,
                'record_id' => $recordId,
                'ip' => $ipAddress
            ]);
            
        } catch (\Exception $e) {
            Logger::getInstance()->error('Audit log failed: ' . $e->getMessage());
        }
    }
    
    public static function logLogin($userId, $success = true)
    {
        $action = $success ? 'USER_LOGIN_SUCCESS' : 'USER_LOGIN_FAILED';
        self::log($action, 'users', $userId);
    }
    
    public static function logLogout($userId)
    {
        self::log('USER_LOGOUT', 'users', $userId);
    }
    
    public static function logCreate($tableName, $recordId, $values)
    {
        self::log('CREATE', $tableName, $recordId, null, $values);
    }
    
    public static function logUpdate($tableName, $recordId, $oldValues, $newValues)
    {
        self::log('UPDATE', $tableName, $recordId, $oldValues, $newValues);
    }
    
    public static function logDelete($tableName, $recordId, $oldValues)
    {
        self::log('DELETE', $tableName, $recordId, $oldValues, null);
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