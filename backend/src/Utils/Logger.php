<?php

namespace App\Utils;

class Logger
{
    private static $instance = null;
    private $logPath;
    
    private function __construct()
    {
        $this->logPath = BASE_PATH . '/storage/logs';
        if (!is_dir($this->logPath)) {
            mkdir($this->logPath, 0755, true);
        }
    }
    
    public static function getInstance()
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    public function info($message, $context = [])
    {
        $this->log('INFO', $message, $context);
    }
    
    public function error($message, $context = [])
    {
        $this->log('ERROR', $message, $context);
    }
    
    public function warning($message, $context = [])
    {
        $this->log('WARNING', $message, $context);
    }
    
    public function security($message, $context = [])
    {
        $this->log('SECURITY', $message, $context, 'security.log');
    }
    
    public function audit($message, $context = [])
    {
        $this->log('AUDIT', $message, $context, 'audit.log');
    }
    
    private function log($level, $message, $context = [], $file = 'app.log')
    {
        $timestamp = date('Y-m-d H:i:s');
        $contextStr = !empty($context) ? ' | ' . json_encode($context) : '';
        $logEntry = "[{$timestamp}] [{$level}] {$message}{$contextStr}" . PHP_EOL;
        
        $logFile = $this->logPath . '/' . $file;
        file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
    }
}