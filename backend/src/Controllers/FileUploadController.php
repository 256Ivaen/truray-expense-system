<?php

namespace App\Controllers;

use App\Services\FileUploadService;
use App\Utils\Response;

class FileUploadController
{
    private $fileUploadService;
    
    public function __construct()
    {
        $this->fileUploadService = new FileUploadService();
    }
    
    public function upload($data)
    {
        try {
            // Check if file was uploaded
            if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
                Response::error('No file uploaded or upload error', 400);
                return;
            }
            
            $uploadedFile = $_FILES['file'];
            
            // Validate file type
            $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
            $fileType = mime_content_type($uploadedFile['tmp_name']);
            
            if (!in_array($fileType, $allowedTypes)) {
                Response::error('Invalid file type. Allowed types: JPEG, PNG, GIF, WebP, PDF', 400);
                return;
            }
            
            // Validate file size (5MB limit)
            $maxSize = 5 * 1024 * 1024; // 5MB in bytes
            if ($uploadedFile['size'] > $maxSize) {
                Response::error('File too large. Maximum size is 5MB', 400);
                return;
            }
            
            // Upload the file
            $result = $this->fileUploadService->uploadFile($uploadedFile, 'receipts');
            
            if ($result['success']) {
                Response::success('File uploaded successfully', $result['data']);
            } else {
                Response::error($result['message'], 400);
            }
            
        } catch (\Exception $e) {
            Response::error('Upload failed: ' . $e->getMessage(), 500);
        }
    }
    
    public function delete($data)
    {
        try {
            $filepath = $data['filepath'] ?? '';
            
            if (empty($filepath)) {
                Response::error('File path is required', 400);
                return;
            }
            
            $result = $this->fileUploadService->deleteFile($filepath);
            
            if ($result['success']) {
                Response::success($result['message']);
            } else {
                Response::error($result['message'], 400);
            }
            
        } catch (\Exception $e) {
            Response::error('Delete failed: ' . $e->getMessage(), 500);
        }
    }
}