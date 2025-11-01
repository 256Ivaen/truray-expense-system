<?php

namespace App\Models;

class Project extends BaseModel
{
    protected $table = 'projects';
    protected $fillable = [
        'project_code', 'name', 'description', 'start_date', 
        'end_date', 'status', 'created_by'
    ];
}