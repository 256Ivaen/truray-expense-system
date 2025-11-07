<?php

namespace App\Validators;

class ProjectValidator
{
    public function validateCreate($data)
    {
        $errors = [];
        
        if (empty($data['name'])) {
            $errors['name'] = 'Project name is required';
        }
        
        if (isset($data['start_date']) && !strtotime($data['start_date'])) {
            $errors['start_date'] = 'Invalid start date format';
        }
        
        if (isset($data['end_date']) && !strtotime($data['end_date'])) {
            $errors['end_date'] = 'Invalid end date format';
        }
        
        return $errors;
    }
    
    public function validateUpdate($data)
    {
        $errors = [];
        
        if (isset($data['start_date']) && !strtotime($data['start_date'])) {
            $errors['start_date'] = 'Invalid start date format';
        }
        
        if (isset($data['end_date']) && !strtotime($data['end_date'])) {
            $errors['end_date'] = 'Invalid end date format';
        }
        
        return $errors;
    }
}