<?php

namespace App\Models;

class AuditLog extends BaseModel
{
    protected $table = 'audit_logs';
    protected $fillable = [
        'user_id', 'action', 'table_name', 'record_id',
        'old_values', 'new_values', 'ip_address', 'user_agent'
    ];
}