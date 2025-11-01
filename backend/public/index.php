<?php

ob_start();

error_reporting(E_ALL);
ini_set('display_errors', '1');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/../storage/logs/php_errors.log');

date_default_timezone_set('Africa/Kampala');

define('BASE_PATH', dirname(__DIR__));

if (!file_exists(BASE_PATH . '/vendor/autoload.php')) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Composer dependencies not installed. Run: composer install'
    ]);
    exit;
}

require_once BASE_PATH . '/vendor/autoload.php';

try {
    $dotenv = Dotenv\Dotenv::createImmutable(BASE_PATH);
    $dotenv->load();
} catch (Exception $e) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => '.env file not found or invalid: ' . $e->getMessage()
    ]);
    exit;
}

ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_secure', '1');
ini_set('session.use_strict_mode', '1');
ini_set('session.cookie_samesite', 'Strict');

use App\Router;
use App\Utils\Response;
use App\Utils\Logger;
use App\Middleware\SecurityMiddleware;

SecurityMiddleware::setSecurityHeaders();
SecurityMiddleware::handleCORS();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$logger = Logger::getInstance();

try {
    $router = new Router();
    
    $method = $_SERVER['REQUEST_METHOD'];
    $uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    
    $scriptName = dirname($_SERVER['SCRIPT_NAME']);
    if ($scriptName !== '/' && $scriptName !== '') {
        $uri = substr($uri, strlen($scriptName));
    }
    
    $uri = '/' . trim($uri, '/');
    
    $body = file_get_contents('php://input');
    $data = json_decode($body, true) ?? [];
    
    if ($method === 'POST' && !empty($_POST)) {
        $data = array_merge($data, $_POST);
    }
    
    if ($method === 'GET' && !empty($_GET)) {
        $data = array_merge($data, $_GET);
    }
    
    $router->dispatch($method, $uri, $data);
    
} catch (Exception $e) {
    $logger->error('Application Error: ' . $e->getMessage(), [
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
    
    $isDevelopment = isset($_ENV['APP_ENV']) && $_ENV['APP_ENV'] === 'development';
    
    $errorResponse = [
        'success' => false,
        'message' => $isDevelopment ? $e->getMessage() : 'An internal server error occurred'
    ];
    
    if ($isDevelopment) {
        $errorResponse['debug'] = [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTrace()
        ];
    }
    
    Response::send($errorResponse, 500);
}

ob_end_flush();