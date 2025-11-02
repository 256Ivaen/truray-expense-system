SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS allocations;
DROP TABLE IF EXISTS finances;
DROP TABLE IF EXISTS project_users;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS rate_limits;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
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

CREATE TABLE finances (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    deposited_by CHAR(36),
    deposited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'approved',
    
    INDEX idx_project_id (project_id),
    INDEX idx_deposited_by (deposited_by),
    INDEX idx_status (status),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (deposited_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE allocations (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    proof_image VARCHAR(255),
    allocated_by CHAR(36),
    allocated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    
    INDEX idx_project_id (project_id),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
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

CREATE VIEW project_balances AS
SELECT 
    p.id,
    p.project_code,
    p.name,
    p.status,
    COALESCE(SUM(f.amount), 0) as total_deposits,
    COALESCE(SUM(a.amount), 0) as total_allocated,
    COALESCE(SUM(e.amount), 0) as total_spent,
    (COALESCE(SUM(f.amount), 0) - COALESCE(SUM(a.amount), 0)) as unallocated_balance,
    (COALESCE(SUM(a.amount), 0) - COALESCE(SUM(e.amount), 0)) as allocated_balance
FROM projects p
LEFT JOIN finances f ON p.id = f.project_id AND f.status = 'approved'
LEFT JOIN allocations a ON p.id = a.project_id AND a.status = 'approved'
LEFT JOIN expenses e ON p.id = e.project_id AND e.status = 'approved'
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.project_code, p.name, p.status;

CREATE VIEW user_allocation_balances AS
SELECT 
    u.id as user_id,
    u.email,
    u.first_name,
    u.last_name,
    p.id as project_id,
    p.project_code,
    p.name as project_name,
    COALESCE(SUM(a.amount), 0) as total_allocated,
    COALESCE(SUM(e.amount), 0) as total_spent,
    (COALESCE(SUM(a.amount), 0) - COALESCE(SUM(e.amount), 0)) as remaining_balance
FROM users u
INNER JOIN project_users pu ON u.id = pu.user_id
INNER JOIN projects p ON pu.project_id = p.id
LEFT JOIN allocations a ON u.id = a.user_id AND p.id = a.project_id AND a.status = 'approved'
LEFT JOIN expenses e ON u.id = e.user_id AND p.id = e.project_id AND e.status = 'approved'
WHERE u.deleted_at IS NULL AND p.deleted_at IS NULL
GROUP BY u.id, u.email, u.first_name, u.last_name, p.id, p.project_code, p.name;

INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_verified) 
VALUES (
    UUID(),
    'admin@tekjuice.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'System',
    'Administrator',
    'admin',
    'active',
    TRUE
);