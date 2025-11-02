<?php

namespace App\Services;

use App\Utils\Database;

class ProjectBalanceService
{
    private $db;
    
    public function __construct()
    {
        $this->db = Database::getInstance();
    }
    
    public function updateAllocation($projectId, $amount)
    {
        // First check if balance exists
        $balance = $this->db->queryOne(
            "SELECT * FROM project_balances WHERE id = ?",
            [$projectId]
        );
        
        if (!$balance) {
            // Create balance record if it doesn't exist
            $this->db->execute(
                "INSERT INTO project_balances (id, total_deposits, unallocated_balance, allocated_balance, total_spent) 
                 VALUES (?, 0, 0, 0, 0)",
                [$projectId]
            );
        }
        
        // Update the balance directly
        return $this->db->execute(
            "UPDATE project_balances 
             SET unallocated_balance = unallocated_balance - ?,
                 allocated_balance = allocated_balance + ?
             WHERE id = ?",
            [$amount, $amount, $projectId]
        );
    }
    
    public function updateExpense($projectId, $amount)
    {
        return $this->db->execute(
            "UPDATE project_balances 
             SET allocated_balance = allocated_balance - ?,
                 total_spent = total_spent + ?
             WHERE id = ?",
            [$amount, $amount, $projectId]
        );
    }
    
    public function getBalance($projectId)
    {
        return $this->db->queryOne(
            "SELECT * FROM project_balances WHERE id = ?",
            [$projectId]
        );
    }
}