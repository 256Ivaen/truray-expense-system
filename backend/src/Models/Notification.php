<?php

namespace App\Models;

class Notification extends BaseModel
{
    protected $table = 'notifications';
    
    protected $fillable = [
        'user_id',
        'type',
        'title',
        'message',
        'related_type',
        'related_id',
        'is_read',
        'read_at'
    ];
}

