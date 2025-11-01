<?php

namespace App\Models;

use App\Utils\Database;
use Ramsey\Uuid\Uuid;

abstract class BaseModel
{
    protected $db;
    protected $table;
    protected $primaryKey = 'id';
    protected $fillable = [];
    protected $hidden = [];
    
    public function __construct()
    {
        $this->db = Database::getInstance();
    }
    
    public function find($id)
    {
        $sql = "SELECT * FROM {$this->table} WHERE {$this->primaryKey} = ? AND deleted_at IS NULL";
        $result = $this->db->queryOne($sql, [$id]);
        
        if ($result) {
            return $this->hideAttributes($result);
        }
        
        return null;
    }
    
    public function all($conditions = [], $orderBy = null, $limit = null, $offset = null)
    {
        $sql = "SELECT * FROM {$this->table} WHERE deleted_at IS NULL";
        $params = [];
        
        foreach ($conditions as $field => $value) {
            $sql .= " AND {$field} = ?";
            $params[] = $value;
        }
        
        if ($orderBy) {
            $sql .= " ORDER BY {$orderBy}";
        }
        
        if ($limit) {
            $sql .= " LIMIT " . (int)$limit;
            if ($offset) {
                $sql .= " OFFSET " . (int)$offset;
            }
        }
        
        $results = $this->db->query($sql, $params);
        
        return array_map([$this, 'hideAttributes'], $results);
    }
    
    public function create($data)
    {
        $data = $this->filterFillable($data);
        $data[$this->primaryKey] = Uuid::uuid4()->toString();
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');
        
        $fields = array_keys($data);
        $placeholders = array_fill(0, count($fields), '?');
        
        $sql = sprintf(
            "INSERT INTO %s (%s) VALUES (%s)",
            $this->table,
            implode(', ', $fields),
            implode(', ', $placeholders)
        );
        
        $result = $this->db->execute($sql, array_values($data));
        
        if ($result['success']) {
            return $this->find($data[$this->primaryKey]);
        }
        
        return null;
    }
    
    public function update($id, $data)
    {
        $data = $this->filterFillable($data);
        $data['updated_at'] = date('Y-m-d H:i:s');
        
        $fields = [];
        foreach (array_keys($data) as $field) {
            $fields[] = "{$field} = ?";
        }
        
        $sql = sprintf(
            "UPDATE %s SET %s WHERE %s = ?",
            $this->table,
            implode(', ', $fields),
            $this->primaryKey
        );
        
        $params = array_values($data);
        $params[] = $id;
        
        $result = $this->db->execute($sql, $params);
        
        if ($result['success']) {
            return $this->find($id);
        }
        
        return null;
    }
    
    public function delete($id)
    {
        $sql = "UPDATE {$this->table} SET deleted_at = NOW() WHERE {$this->primaryKey} = ?";
        $result = $this->db->execute($sql, [$id]);
        
        return $result['success'];
    }
    
    public function forceDelete($id)
    {
        $sql = "DELETE FROM {$this->table} WHERE {$this->primaryKey} = ?";
        $result = $this->db->execute($sql, [$id]);
        
        return $result['success'];
    }
    
    public function count($conditions = [])
    {
        $sql = "SELECT COUNT(*) as count FROM {$this->table} WHERE deleted_at IS NULL";
        $params = [];
        
        foreach ($conditions as $field => $value) {
            $sql .= " AND {$field} = ?";
            $params[] = $value;
        }
        
        $result = $this->db->queryOne($sql, $params);
        
        return $result['count'] ?? 0;
    }
    
    protected function filterFillable($data)
    {
        if (empty($this->fillable)) {
            return $data;
        }
        
        return array_intersect_key($data, array_flip($this->fillable));
    }
    
    protected function hideAttributes($data)
    {
        if (empty($this->hidden)) {
            return $data;
        }
        
        foreach ($this->hidden as $attribute) {
            unset($data[$attribute]);
        }
        
        return $data;
    }
    
    public function beginTransaction()
    {
        return $this->db->beginTransaction();
    }
    
    public function commit()
    {
        return $this->db->commit();
    }
    
    public function rollback()
    {
        return $this->db->rollback();
    }
}