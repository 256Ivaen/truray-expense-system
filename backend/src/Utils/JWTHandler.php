<?php

namespace App\Utils;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;

class JWTHandler
{
    private $config;
    
    public function __construct()
    {
        $this->config = require BASE_PATH . '/config/jwt.php';
    }
    
    public function generate($userId, $email, $role)
    {
        $issuedAt = time();
        $expire = $issuedAt + $this->config['expiration'];
        
        $payload = [
            'iss' => $this->config['issuer'],
            'aud' => $this->config['audience'],
            'iat' => $issuedAt,
            'exp' => $expire,
            'sub' => $userId,
            'email' => $email,
            'role' => $role
        ];
        
        return JWT::encode($payload, $this->config['secret'], $this->config['algorithm']);
    }
    
    public function generateRefreshToken($userId)
    {
        $issuedAt = time();
        $expire = $issuedAt + $this->config['refresh_expiration'];
        
        $payload = [
            'iss' => $this->config['issuer'],
            'aud' => $this->config['audience'],
            'iat' => $issuedAt,
            'exp' => $expire,
            'sub' => $userId,
            'type' => 'refresh'
        ];
        
        return JWT::encode($payload, $this->config['secret'], $this->config['algorithm']);
    }
    
    public function validate($token)
    {
        try {
            $decoded = JWT::decode($token, new Key($this->config['secret'], $this->config['algorithm']));
            return (array) $decoded;
        } catch (Exception $e) {
            throw new Exception('Invalid token: ' . $e->getMessage());
        }
    }
    
    public static function extractToken()
    {
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;
        
        if (!$authHeader) {
            return null;
        }
        
        if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return $matches[1];
        }
        
        return null;
    }
    
    public static function hashToken($token)
    {
        return hash('sha256', $token);
    }
}