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
            if (isset($data['data']) && isset($data['pagination'])) {
                $response['data'] = $data['data'];
                $response['pagination'] = $data['pagination'];
                
                // Include allocation summary if present
                if (isset($data['allocation_summary'])) {
                    $response['allocation_summary'] = $data['allocation_summary'];
                }
                
                // Include expense summary if present
                if (isset($data['expense_summary'])) {
                    $response['expense_summary'] = $data['expense_summary'];
                }
            } else {
                $response['data'] = $data;
            }
        }
        
        self::send($response, $statusCode);
    }
    
    public static function paginated($data, $total, $page, $perPage, $allocationSummary = null, $expenseSummary = null, $message = 'Success')
    {
        $totalPages = ceil($total / $perPage);
        
        $response = [
            'success' => true,
            'message' => $message,
            'data' => $data,
            'pagination' => [
                'current_page' => (int)$page,
                'per_page' => (int)$perPage,
                'total' => (int)$total,
                'total_pages' => (int)$totalPages,
                'has_next_page' => $page < $totalPages,
                'has_previous_page' => $page > 1
            ]
        ];
        
        // Add allocation summary (for main cards - everyone sees this)
        if ($allocationSummary !== null) {
            $response['allocation_summary'] = $allocationSummary;
        }
        
        // Add expense summary (only for admin/super admin)
        if ($expenseSummary !== null) {
            $response['expense_summary'] = $expenseSummary;
        }
        
        self::send($response, 200);
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