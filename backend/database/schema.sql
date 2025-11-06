SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS allocations;
DROP TABLE IF EXISTS finances;
DROP TABLE IF EXISTS project_expense_types;
DROP TABLE IF EXISTS project_users;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS users;
DROP VIEW IF EXISTS system_balance;
DROP VIEW IF EXISTS project_allocations;
DROP VIEW IF EXISTS project_balances;
DROP VIEW IF EXISTS user_allocation_balances;
SET FOREIGN_KEY_CHECKS=1;

CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    role ENUM('admin', 'finance_manager', 'user') NOT NULL DEFAULT 'user',
    status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token CHAR(64),
    email_verification_expires DATETIME,
    password_reset_token CHAR(64),
    password_reset_expires DATETIME,
    last_login DATETIME,
    failed_login_attempts INT DEFAULT 0,
    account_locked_until DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by CHAR(36),
    deleted_at DATETIME,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status),
    INDEX idx_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE projects (
    id CHAR(36) PRIMARY KEY,
    project_code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status ENUM('planning', 'active', 'completed', 'cancelled', 'closed') NOT NULL DEFAULT 'planning',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by CHAR(36),
    deleted_at DATETIME,
    
    INDEX idx_project_code (project_code),
    INDEX idx_status (status),
    INDEX idx_deleted_at (deleted_at),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE project_users (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    assigned_by CHAR(36),
    
    UNIQUE KEY unique_project_user (project_id, user_id),
    INDEX idx_project_id (project_id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE project_expense_types (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY uq_project_expense_types (project_id, name),
    INDEX idx_project_id (project_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FINANCES TABLE: System-wide deposits (no project_id)
CREATE TABLE finances (
    id CHAR(36) PRIMARY KEY,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    deposited_by CHAR(36),
    deposited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_deposited_by (deposited_by),
    INDEX idx_status (status),
    INDEX idx_deposited_at (deposited_at),
    FOREIGN KEY (deposited_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ALLOCATIONS TABLE: Allocate system finances to projects (no user_id)
CREATE TABLE allocations (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    proof_image VARCHAR(255),
    allocated_by CHAR(36),
    allocated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_project_id (project_id),
    INDEX idx_status (status),
    INDEX idx_allocated_at (allocated_at),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (allocated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE expenses (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    allocation_id CHAR(36),
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    receipt_image VARCHAR(255),
    spent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_by CHAR(36),
    approved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_project_id (project_id),
    INDEX idx_user_id (user_id),
    INDEX idx_allocation_id (allocation_id),
    INDEX idx_status (status),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (allocation_id) REFERENCES allocations(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sessions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id CHAR(36),
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_action (action),
    INDEX idx_table_name (table_name),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rate_limits (
    id CHAR(36) PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_identifier (identifier),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_type VARCHAR(50),
    related_id CHAR(36),
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at),
    INDEX idx_type (type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- VIEW: System-wide finance balance
CREATE VIEW system_balance AS
SELECT 
    COALESCE(SUM(f.amount), 0) as total_deposits,
    COALESCE((SELECT SUM(amount) FROM allocations WHERE status = 'approved'), 0) as total_allocated,
    COALESCE(SUM(f.amount), 0) - COALESCE((SELECT SUM(amount) FROM allocations WHERE status = 'approved'), 0) as available_balance,
    COALESCE((SELECT SUM(amount) FROM finances WHERE status = 'approved' AND MONTH(deposited_at) = MONTH(CURRENT_DATE()) AND YEAR(deposited_at) = YEAR(CURRENT_DATE())), 0) as this_month_deposits
FROM finances f
WHERE f.status = 'approved';

-- VIEW: Project allocations summary
CREATE VIEW project_allocations AS
SELECT 
    p.id,
    p.project_code,
    p.name as project_name,
    p.status,
    COALESCE(SUM(CASE WHEN a.status = 'approved' THEN a.amount ELSE 0 END), 0) as total_allocated,
    COALESCE((SELECT SUM(amount) FROM expenses WHERE project_id = p.id AND status = 'approved'), 0) as total_spent,
    COALESCE(SUM(CASE WHEN a.status = 'approved' THEN a.amount ELSE 0 END), 0) - 
    COALESCE((SELECT SUM(amount) FROM expenses WHERE project_id = p.id AND status = 'approved'), 0) as remaining_balance
FROM projects p
LEFT JOIN allocations a ON p.id = a.project_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.project_code, p.name, p.status;

-- VIEW: Project balances (kept for backward compatibility)
CREATE VIEW project_balances AS
SELECT 
    p.id,
    p.project_code,
    p.name,
    p.status,
    0 as total_deposits,
    COALESCE(SUM(a.amount), 0) as total_allocated,
    COALESCE((SELECT SUM(amount) FROM expenses WHERE project_id = p.id AND status = 'approved'), 0) as total_spent,
    0 as unallocated_balance,
    COALESCE(SUM(a.amount), 0) - COALESCE((SELECT SUM(amount) FROM expenses WHERE project_id = p.id AND status = 'approved'), 0) as allocated_balance
FROM projects p
LEFT JOIN allocations a ON p.id = a.project_id AND a.status = 'approved'
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.project_code, p.name, p.status;

-- VIEW: User allocation balances (for expenses tracking per user)
CREATE VIEW user_allocation_balances AS
SELECT 
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    p.id as project_id,
    p.project_code,
    p.name as project_name,
    COALESCE((SELECT SUM(amount) FROM expenses WHERE user_id = u.id AND project_id = p.id AND status = 'approved'), 0) as total_spent
FROM users u
INNER JOIN project_users pu ON u.id = pu.user_id
INNER JOIN projects p ON pu.project_id = p.id
WHERE u.deleted_at IS NULL AND p.deleted_at IS NULL
GROUP BY u.id, u.email, u.first_name, u.last_name, p.id, p.project_code, p.name;

-- Insert default admin user
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_verified) 
VALUES (
    UUID(),
    'iodekeivan@gmail.com',
    '$2y$12$QdL0bUyhE5fTeRRObKoTuu.blUFy5ET9CLguiCyyvmmxNVhx7uUDW',
    'System',
    'Administrator',
    'admin',
    'active',
    TRUE
);