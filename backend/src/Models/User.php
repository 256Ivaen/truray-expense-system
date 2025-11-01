<?php

namespace App\Models;

class User extends BaseModel
{
    protected $table = 'users';
    protected $fillable = [
        'email', 'password_hash', 'first_name', 'last_name', 
        'phone', 'role', 'status', 'created_by'
    ];
    protected $hidden = ['password_hash', 'password_reset_token', 'email_verification_token'];
}