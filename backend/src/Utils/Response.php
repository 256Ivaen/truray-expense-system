<?php

namespace App\Utils;

class Response
{
    public static function send($data, $statusCode = 200)
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
    
    public static function success($data = null, $message = 'Success', $statusCode = 200)
    {
        $response = [
            'success' => true,
            'message' => $message
        ];
        
        if ($data !== null) {
            $response['data'] = $data;
        }
        
        self::send($response, $statusCode);
    }
    
    public static function error($message = 'An error occurred', $statusCode = 400, $errors = null)
    {
        $response = [
            'success' => false,
            'message' => $message
        ];
        
        if ($errors !== null) {
            $response['errors'] = $errors;
        }
        
        self::send($response, $statusCode);
    }
    
    public static function validationError($errors, $message = 'Validation failed')
    {
        self::error($message, 422, $errors);
    }
    
    public static function unauthorized($message = 'Unauthorized')
    {
        self::error($message, 401);
    }
    
    public static function forbidden($message = 'Forbidden')
    {
        self::error($message, 403);
    }
    
    public static function notFound($message = 'Resource not found')
    {
        self::error($message, 404);
    }
    
    public static function serverError($message = 'Internal server error')
    {
        self::error($message, 500);
    }
}