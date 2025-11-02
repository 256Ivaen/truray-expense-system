<?php

define('BASE_PATH', dirname(__DIR__));

require_once BASE_PATH . '/vendor/autoload.php';

use App\Utils\Database;
use App\Utils\JWTHandler;

class WebSocketServer
{
    private $socket;
    private $clients = [];
    private $authenticated = [];
    private $db;
    private $lastCheck = [];
    
    public function __construct($host = '0.0.0.0', $port = 8080)
    {
        $this->db = Database::getInstance();
        
        $this->socket = socket_create(AF_INET, SOCK_STREAM, SOL_TCP);
        socket_set_option($this->socket, SOL_SOCKET, SO_REUSEADDR, 1);
        socket_bind($this->socket, $host, $port);
        socket_listen($this->socket, 5);
        
        echo "WebSocket server started on {$host}:{$port}\n";
        
        $this->lastCheck['notifications'] = time();
        $this->lastCheck['expenses'] = time();
        $this->lastCheck['allocations'] = time();
        $this->lastCheck['finances'] = time();
    }
    
    public function run()
    {
        while (true) {
            $sockets = array_merge([$this->socket], $this->clients);
            $changed = $sockets;
            
            socket_select($changed, $null, $null, 0, 100000);
            
            if (in_array($this->socket, $changed)) {
                $newClient = socket_accept($this->socket);
                $this->clients[] = $newClient;
                $key = array_search($this->socket, $changed);
                unset($changed[$key]);
                
                $this->handleHandshake($newClient);
            }
            
            foreach ($changed as $client) {
                $data = @socket_read($client, 1024);
                
                if ($data === false || strlen($data) === 0) {
                    $key = array_search($client, $this->clients);
                    $clientHash = spl_object_hash($client);
                    unset($this->clients[$key]);
                    unset($this->authenticated[$clientHash]);
                    socket_close($client);
                    continue;
                }
                
                $decoded = $this->decode($data);
                
                if ($decoded) {
                    $this->handleMessage($client, $decoded);
                }
            }
            
            $this->checkDatabaseChanges();
            
            usleep(100000);
        }
    }
    
    private function handleHandshake($client)
    {
        $request = socket_read($client, 5000);
        
        if (preg_match('/Sec-WebSocket-Key: (.*)\r\n/', $request, $matches)) {
            $key = $matches[1];
            $response = "HTTP/1.1 101 Switching Protocols\r\n";
            $response .= "Upgrade: websocket\r\n";
            $response .= "Connection: Upgrade\r\n";
            $response .= "Sec-WebSocket-Accept: " . base64_encode(sha1($key . "258EAFA5-E914-47DA-95CA-C5AB0DC85B11", true)) . "\r\n\r\n";
            
            socket_write($client, $response, strlen($response));
        }
    }
    
    private function handleMessage($client, $message)
    {
        $data = json_decode($message, true);
        
        if (!$data || !isset($data['type'])) {
            return;
        }
        
        if ($data['type'] === 'authenticate' && isset($data['token'])) {
            try {
                $decoded = JWTHandler::decode($data['token']);
                $userId = $decoded['sub'] ?? null;
                
                if ($userId) {
                    socket_set_option($client, SOL_SOCKET, SO_RCVTIMEO, ['sec' => 3600, 'usec' => 0]);
                    $this->authenticated[spl_object_hash($client)] = $userId;
                    $this->send($client, [
                        'type' => 'authenticated',
                        'user_id' => $userId
                    ]);
                    
                    $this->sendNotifications($client, $userId);
                } else {
                    $this->send($client, ['type' => 'error', 'message' => 'Invalid token']);
                }
            } catch (\Exception $e) {
                $this->send($client, ['type' => 'error', 'message' => 'Authentication failed']);
            }
        }
    }
    
    private function checkDatabaseChanges()
    {
        $now = time();
        
        if ($now - $this->lastCheck['notifications'] < 2) {
            return;
        }
        
        $this->lastCheck['notifications'] = $now;
        
        $newNotifications = $this->db->query(
            "SELECT n.*, u.email, u.first_name, u.last_name 
             FROM notifications n
             INNER JOIN users u ON n.user_id = u.id
             WHERE n.created_at > DATE_SUB(NOW(), INTERVAL 5 SECOND)
             AND n.is_read = FALSE
             ORDER BY n.created_at DESC"
        );
        
        foreach ($newNotifications as $notification) {
            $this->broadcastToUser($notification['user_id'], [
                'type' => 'notification',
                'data' => $notification
            ]);
        }
    }
    
    private function broadcastToUser($userId, $message)
    {
        foreach ($this->clients as $client) {
            $clientHash = spl_object_hash($client);
            if (isset($this->authenticated[$clientHash]) && $this->authenticated[$clientHash] === $userId) {
                try {
                    $this->send($client, $message);
                } catch (\Exception $e) {
                    continue;
                }
            }
        }
    }
    
    private function sendNotifications($client, $userId)
    {
        $notifications = $this->db->query(
            "SELECT * FROM notifications 
             WHERE user_id = ? AND is_read = FALSE 
             ORDER BY created_at DESC 
             LIMIT 10",
            [$userId]
        );
        
        if (!empty($notifications)) {
            $this->send($client, [
                'type' => 'notifications',
                'data' => $notifications
            ]);
        }
    }
    
    private function send($client, $data)
    {
        $encoded = $this->encode(json_encode($data));
        @socket_write($client, $encoded);
    }
    
    private function encode($data)
    {
        $length = strlen($data);
        $bytes = chr(0x81);
        
        if ($length < 126) {
            $bytes .= chr($length);
        } elseif ($length < 65536) {
            $bytes .= chr(126) . pack('n', $length);
        } else {
            $bytes .= chr(127) . pack('N', 0) . pack('N', $length);
        }
        
        return $bytes . $data;
    }
    
    private function decode($data)
    {
        $length = ord($data[1]) & 127;
        $maskStart = 2;
        
        if ($length == 126) {
            $maskStart = 4;
            $length = unpack('n', substr($data, 2, 2))[1];
        } elseif ($length == 127) {
            $maskStart = 10;
            $length = unpack('N', substr($data, 6, 4))[1];
        }
        
        $mask = substr($data, $maskStart, 4);
        $message = substr($data, $maskStart + 4);
        
        $decoded = '';
        for ($i = 0; $i < strlen($message); $i++) {
            $decoded .= $message[$i] ^ $mask[$i % 4];
        }
        
        return $decoded;
    }
    
    public function __destruct()
    {
        if ($this->socket) {
            socket_close($this->socket);
        }
    }
}

try {
    $dotenv = Dotenv\Dotenv::createImmutable(BASE_PATH);
    $dotenv->load();
} catch (Exception $e) {
}

$host = $_ENV['WS_HOST'] ?? '0.0.0.0';
$port = $_ENV['WS_PORT'] ?? 8080;

$server = new WebSocketServer($host, $port);
$server->run();

