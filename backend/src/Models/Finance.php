<?php

namespace App\Models;

class Finance extends BaseModel
{
    protected $table = 'finances';
    protected $fillable = [
        'project_id', 'amount', 'description', 'deposited_by', 'status'
    ];
}