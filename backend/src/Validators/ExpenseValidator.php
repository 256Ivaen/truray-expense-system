<?php

namespace App\Validators;

class ExpenseValidator
{
    public function validateCreate($data)
    {
        $errors = [];
        
        if (empty($data['project_id'])) {
            $errors['project_id'] = 'Project is required';
        }
        
        if (empty($data['amount']) || !is_numeric($data['amount']) || $data['amount'] <= 0) {
            $errors['amount'] = 'Valid amount greater than 0 is required';
        }
        
        if (empty($data['description'])) {
            $errors['description'] = 'Description is required';
        }
        
        return $errors;
    }
    
    public function validateUpdate($data)
    {
        $errors = [];
        
        if (isset($data['amount']) && (!is_numeric($data['amount']) || $data['amount'] <= 0)) {
            $errors['amount'] = 'Valid amount greater than 0 is required';
        }
        
        return $errors;
    }
}