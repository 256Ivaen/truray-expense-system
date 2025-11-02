<?php

namespace App\Services;

use App\Models\Notification;
use App\Utils\Database;
use Ramsey\Uuid\Uuid;

class NotificationService
{
    private $notificationModel;
    private $db;
    
    public function __construct()
    {
        $this->notificationModel = new Notification();
        $this->db = Database::getInstance();
    }
    
    public function getAll($userId, $page = 1, $perPage = 5)
    {
        $sql = "SELECT * FROM notifications WHERE user_id = ?";
        $params = [$userId];
        
        $countSql = "SELECT COUNT(*) as total FROM notifications WHERE user_id = ?";
        $countResult = $this->db->queryOne($countSql, $params);
        $total = $countResult['total'] ?? 0;
        
        $sql .= " ORDER BY created_at DESC";
        $offset = ($page - 1) * $perPage;
        $sql .= " LIMIT " . (int)$perPage . " OFFSET " . (int)$offset;
        
        $data = $this->db->query($sql, $params);
        
        return [
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage
        ];
    }
    
    public function getUnread($userId)
    {
        $sql = "SELECT COUNT(*) as total FROM notifications WHERE user_id = ? AND is_read = FALSE";
        $result = $this->db->queryOne($sql, [$userId]);
        return $result['total'] ?? 0;
    }
    
    public function markAsRead($id, $userId)
    {
        $notification = $this->db->queryOne(
            "SELECT id FROM notifications WHERE id = ? AND user_id = ?",
            [$id, $userId]
        );
        
        if (!$notification) {
            return ['success' => false, 'message' => 'Notification not found'];
        }
        
        $this->db->execute(
            "UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE id = ?",
            [$id]
        );
        
        return ['success' => true, 'message' => 'Notification marked as read'];
    }
    
    public function markAllAsRead($userId)
    {
        $this->db->execute(
            "UPDATE notifications SET is_read = TRUE, read_at = NOW() WHERE user_id = ? AND is_read = FALSE",
            [$userId]
        );
        
        return ['success' => true, 'message' => 'All notifications marked as read'];
    }
    
    public function create($userId, $type, $title, $message, $relatedType = null, $relatedId = null)
    {
        $notificationId = Uuid::uuid4()->toString();
        
        $this->db->execute(
            "INSERT INTO notifications (id, user_id, type, title, message, related_type, related_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?)",
            [
                $notificationId,
                $userId,
                $type,
                $title,
                $message,
                $relatedType,
                $relatedId
            ]
        );
        
        return $this->db->queryOne(
            "SELECT * FROM notifications WHERE id = ?",
            [$notificationId]
        );
    }
}

