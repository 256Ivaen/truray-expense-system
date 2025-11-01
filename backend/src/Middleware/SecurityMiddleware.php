<?php

namespace App\Middleware;

use App\Utils\Response;

class SecurityMiddleware
{
    public static function setSecurityHeaders()
    {
        $config = require BASE_PATH . '/config/security.php';
        $headers = $config['headers'];
        
        foreach ($headers as $name => $value) {
            header("{$name}: {$value}");
        }
        
        header("Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;");
    }
    
    public static function handleCORS()
    {
        $config = require BASE_PATH . '/config/security.php';
        $cors = $config['cors'];
        
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        
        if (in_array('*', $cors['allowed_origins']) || in_array($origin, $cors['allowed_origins'])) {
            $allowedOrigin = in_array('*', $cors['allowed_origins']) ? '*' : $origin;
            header("Access-Control-Allow-Origin: {$allowedOrigin}");
        }
        
        header("Access-Control-Allow-Methods: " . implode(', ', $cors['allowed_methods']));
        header("Access-Control-Allow-Headers: " . implode(', ', $cors['allowed_headers']));
        
        if ($cors['allow_credentials']) {
            header("Access-Control-Allow-Credentials: true");
        }
        
        header("Access-Control-Max-Age: " . $cors['max_age']);
    }
    
    public static function sanitizeInput($data)
    {
        if (is_array($data)) {
            return array_map([self::class, 'sanitizeInput'], $data);
        }
        
        if (is_string($data)) {
            $data = str_replace(chr(0), '', $data);
            $data = trim($data);
            $data = htmlspecialchars($data, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            
            return $data;
        }
        
        return $data;
    }
    
    public static function validateCSRF()
    {
        $headers = getallheaders();
        $token = $headers['X-CSRF-Token'] ?? null;
        
        session_start();
        $sessionToken = $_SESSION['csrf_token'] ?? null;
        
        if (!$token || !$sessionToken || !hash_equals($sessionToken, $token)) {
            Response::error('CSRF token validation failed', 403);
        }
        
        return true;
    }
    
    public static function generateCSRFToken()
    {
        if (!isset($_SESSION)) {
            session_start();
        }
        
        if (!isset($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        
        return $_SESSION['csrf_token'];
    }
}