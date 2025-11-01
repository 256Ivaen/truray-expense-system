<?php

namespace App\Models;

class Allocation extends BaseModel
{
    protected $table = 'allocations';
    protected $fillable = [
        'project_id', 'user_id', 'amount', 'description', 
        'proof_image', 'allocated_by', 'status'
    ];
}