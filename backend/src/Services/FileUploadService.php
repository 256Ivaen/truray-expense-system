<?php

namespace App\Services;

use App\Utils\FileUploader;

class FileUploadService
{
    private $fileUploader;
    
    public function __construct()
    {
        $this->fileUploader = new FileUploader();
    }
    
    public function uploadFile($file, $subfolder = '')
    {
        try {
            $filepath = $this->fileUploader->upload($file, $subfolder);
            $url = $this->fileUploader->getUrl($filepath);
            
            return [
                'success' => true,
                'data' => [
                    'filepath' => $filepath,
                    'url' => $url
                ]
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'File upload failed: ' . $e->getMessage()
            ];
        }
    }
    
    public function deleteFile($filepath)
    {
        try {
            $result = $this->fileUploader->delete($filepath);
            
            if ($result) {
                return ['success' => true, 'message' => 'File deleted successfully'];
            }
            
            return ['success' => false, 'message' => 'File not found'];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => 'File deletion failed: ' . $e->getMessage()];
        }
    }
    
    public function getFileUrl($filepath)
    {
        return $this->fileUploader->getUrl($filepath);
    }
}