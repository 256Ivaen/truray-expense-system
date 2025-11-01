<?php

namespace App\Utils;

use Exception;

class FileUploader
{
    private $config;
    private $uploadPath;
    
    public function __construct()
    {
        $this->config = require BASE_PATH . '/config/security.php';
        $this->uploadPath = BASE_PATH . '/' . $this->config['upload']['path'];
        
        if (!is_dir($this->uploadPath)) {
            mkdir($this->uploadPath, 0755, true);
        }
    }
    
    public function upload($file, $subfolder = '')
    {
        $this->validate($file);
        
        $targetPath = $this->uploadPath;
        if ($subfolder) {
            $targetPath .= '/' . $subfolder;
            if (!is_dir($targetPath)) {
                mkdir($targetPath, 0755, true);
            }
        }
        
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        $filename = $this->generateFilename() . '.' . $extension;
        $targetFile = $targetPath . '/' . $filename;
        
        if (!move_uploaded_file($file['tmp_name'], $targetFile)) {
            throw new Exception('Failed to upload file');
        }
        
        $relativePath = $subfolder ? $subfolder . '/' . $filename : $filename;
        return $relativePath;
    }
    
    private function validate($file)
    {
        if (!isset($file['tmp_name']) || !is_uploaded_file($file['tmp_name'])) {
            throw new Exception('No file uploaded');
        }
        
        if ($file['error'] !== UPLOAD_ERR_OK) {
            throw new Exception('File upload error: ' . $file['error']);
        }
        
        if ($file['size'] > $this->config['upload']['max_size']) {
            $maxSizeMB = $this->config['upload']['max_size'] / 1048576;
            throw new Exception("File size exceeds maximum allowed ({$maxSizeMB}MB)");
        }
        
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, $this->config['upload']['allowed_extensions'])) {
            throw new Exception('File type not allowed');
        }
        
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
        
        $allowedMimes = [
            'jpg' => 'image/jpeg',
            'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'pdf' => 'application/pdf'
        ];
        
        if (!isset($allowedMimes[$extension]) || $mimeType !== $allowedMimes[$extension]) {
            throw new Exception('Invalid file type');
        }
        
        return true;
    }
    
    private function generateFilename()
    {
        return \Ramsey\Uuid\Uuid::uuid4()->toString();
    }
    
    public function delete($filepath)
    {
        $fullPath = $this->uploadPath . '/' . $filepath;
        if (file_exists($fullPath)) {
            return unlink($fullPath);
        }
        return false;
    }
    
    public function getUrl($filepath)
    {
        $appUrl = $_ENV['APP_URL'] ?? 'http://localhost';
        return rtrim($appUrl, '/') . '/uploads/' . ltrim($filepath, '/');
    }
}