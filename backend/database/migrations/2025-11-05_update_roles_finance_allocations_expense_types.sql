START TRANSACTION;

UPDATE users
SET role = 'user'
WHERE role = 'finance_manager';

ALTER TABLE users
MODIFY COLUMN role ENUM('admin', 'user') NOT NULL DEFAULT 'user';

CREATE TEMPORARY TABLE _dup_project_users_ids (id CHAR(36) PRIMARY KEY);

INSERT INTO _dup_project_users_ids (id)
SELECT id FROM (
  SELECT
    id,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY assigned_at ASC, id ASC) AS rn
  FROM project_users
) AS ranked
WHERE rn > 1;

DELETE pu
FROM project_users pu
JOIN _dup_project_users_ids d ON pu.id = d.id;

DROP TEMPORARY TABLE _dup_project_users_ids;

SET @dbname = DATABASE();
SET @tablename = "project_users";
SET @indexname = "uq_project_users_user_id";

SELECT COUNT(*) INTO @index_exists
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = @dbname
  AND TABLE_NAME = @tablename
  AND INDEX_NAME = @indexname;

SET @sql = IF(@index_exists = 0,
  'ALTER TABLE project_users ADD UNIQUE KEY uq_project_users_user_id (user_id)',
  'SELECT ''Unique index uq_project_users_user_id already exists'' AS status');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE finances
MODIFY COLUMN project_id CHAR(36) NULL;

ALTER TABLE allocations
MODIFY COLUMN user_id CHAR(36) NULL;

CREATE TABLE IF NOT EXISTS project_expense_types (
  id CHAR(36) NOT NULL,
  project_id CHAR(36) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_project_expense_types (project_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE project_expense_types
ADD CONSTRAINT fk_pet_project
FOREIGN KEY (project_id) REFERENCES projects(id)
ON DELETE CASCADE;

ALTER TABLE expenses
ADD COLUMN expense_type_id CHAR(36) NULL;


ALTER TABLE expenses
ADD CONSTRAINT fk_expense_type
FOREIGN KEY (expense_type_id) REFERENCES project_expense_types(id)
ON DELETE SET NULL;

INSERT INTO project_expense_types (id, project_id, name)
SELECT
  UUID(),
  e.project_id,
  e.category
FROM (
  SELECT DISTINCT project_id, category
  FROM expenses
  WHERE category IS NOT NULL AND category <> ''
) AS e
LEFT JOIN project_expense_types pet
  ON pet.project_id = e.project_id AND pet.name = e.category
WHERE pet.id IS NULL;

UPDATE expenses ex
JOIN project_expense_types pet
  ON pet.project_id = ex.project_id AND pet.name = ex.category
SET ex.expense_type_id = pet.id
WHERE ex.category IS NOT NULL AND ex.category <> '' AND ex.expense_type_id IS NULL;

ALTER TABLE expenses
MODIFY COLUMN expense_type_id CHAR(36) NOT NULL;

COMMIT;