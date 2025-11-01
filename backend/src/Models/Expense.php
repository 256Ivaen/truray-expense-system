<?php

namespace App\Models;

class Expense extends BaseModel
{
    protected $table = 'expenses';
    protected $fillable = [
        'project_id', 'user_id', 'allocation_id', 'amount', 
        'description', 'category', 'receipt_image', 'status'
    ];
}