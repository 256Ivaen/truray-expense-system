<?php

namespace App\Validators;

class UserValidator
{
    public function validateCreate($data)
    {
        $errors = [];
        
        if (empty($data['email'])) {
            $errors['email'] = 'Email is required';
        } elseif (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Invalid email format';
        }
        
        if (empty($data['password'])) {
            $errors['password'] = 'Password is required';
        } elseif (strlen($data['password']) < 8) {
            $errors['password'] = 'Password must be at least 8 characters';
        }
        
        if (empty($data['first_name'])) {
            $errors['first_name'] = 'First name is required';
        }
        
        if (empty($data['last_name'])) {
            $errors['last_name'] = 'Last name is required';
        }
        
        if (empty($data['role'])) {
            $errors['role'] = 'Role is required';
        } elseif (!in_array($data['role'], ['admin', 'user'])) {
            $errors['role'] = 'Invalid role';
        }
        
        return $errors;
    }
    
    public function validateUpdate($data)
    {
        $errors = [];
        
        if (isset($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Invalid email format';
        }
        
        if (isset($data['password']) && strlen($data['password']) < 8) {
            $errors['password'] = 'Password must be at least 8 characters';
        }
        
        if (isset($data['role']) && !in_array($data['role'], ['admin', 'user'])) {
            $errors['role'] = 'Invalid role';
        }
        
        return $errors;
    }
}