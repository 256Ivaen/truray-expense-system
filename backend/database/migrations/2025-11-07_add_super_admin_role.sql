-- Add super_admin role and update permissions expectations

START TRANSACTION;

-- Extend users.role enum to include 'super_admin'
ALTER TABLE users
MODIFY COLUMN role ENUM('super_admin','admin','user') NOT NULL DEFAULT 'user';

-- Optional: ensure there is at least one super admin (adjust ID/email as needed)
-- UPDATE users SET role = 'super_admin' WHERE email = 'owner@example.com';

COMMIT;


