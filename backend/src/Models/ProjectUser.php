<?php

namespace App\Models;

class ProjectUser extends BaseModel
{
    protected $table = 'project_users';
    protected $fillable = ['project_id', 'user_id', 'assigned_by'];
}