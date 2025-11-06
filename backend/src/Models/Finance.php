<?php

namespace App\Models;

class Finance extends BaseModel
{
    protected $table = 'finances';
    protected $fillable = [
        'amount', 'description', 'deposited_by', 'status'
    ];
}