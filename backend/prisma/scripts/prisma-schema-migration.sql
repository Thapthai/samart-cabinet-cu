-- =============================================================================
-- Migration SQL ตาม Prisma schema (User รวม, StaffRole ใหม่, จำกัดแผนกต่อ role)
-- MySQL 8+  |  รัน backup ก่อน: mysqldump ... > backup.sql
-- =============================================================================
-- ลำดับแนะนำ:
--   1) ส่วน A — ตาราง role (rename หรือสร้างใหม่)
--   2) ส่วน B — ตาราง app_users (สร้างใหม่ หรือ alter จากตารางเดิม)
--   3) ส่วน C — ย้ายข้อมูล (เลือก path ตามที่มีในฐานข้อมูล)
--   4) ส่วน D — ตารางใหม่ app_staff_role_permission_departments
--   5) ส่วน E — Foreign keys (หลังมีข้อมูลครบ)
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -----------------------------------------------------------------------------
-- A) StaffRole / StaffRolePermission — เปลี่ยนชื่อตาราง (ถ้ายังใช้ชื่อเดิม)
-- -----------------------------------------------------------------------------
-- ถ้ามี app_staff_roles อยู่แล้ว:
-- RENAME TABLE app_staff_roles TO app_staff_roles;

-- ถ้ามี app_staff_role_permissions อยู่แล้ว:
-- RENAME TABLE appermissions TO app_staff_role_permissions;

-- ถ้ายังไม่มีตาราง role เลย — สร้างใหม่:
CREATE TABLE IF NOT EXISTS app_staff_roles (
  id INT NOT NULL AUTO_INCREMENT,
  code VARCHAR(191) NOT NULL,
  name VARCHAR(191) NOT NULL,
  description TEXT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY code (code),
  KEY idx_code (code),
  KEY idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS app_staff_role_permissions (
  id INT NOT NULL AUTO_INCREMENT,
  role_id INT NOT NULL,
  menu_href VARCHAR(191) NOT NULL,
  can_access TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY role_menu_href (role_id, menu_href),
  KEY idx_role_id (role_id),
  KEY idx_menu_href (menu_href)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- คัดลอกจากตารางเก่า (รันครั้งเดียว หลัง rename หรือถ้ายังมีตารางเก่าคู่ขนาน)
-- INSERT INTO app_staff_roles (id, code, name, description, is_active, created_at, updated_at)
-- SELECT id, code, name, description, is_active, created_at, updated_at
-- FROM app_staff_roles
-- ON DUPLICATE KEY UPDATE code = VALUES(code);

-- INSERT INTO app_staff_role_permissions (id, role_id, menu_href, can_access, created_at, updated_at)
-- SELECT id, role_id, menu_href, can_access, created_at, updated_at
-- FROM app_staff_role_permissions
-- ON DUPLICATE KEY UPDATE menu_href = VALUES(menu_href);

-- -----------------------------------------------------------------------------
-- B) app_users — โครงสร้างตาม model User
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_users (
  id INT NOT NULL AUTO_INCREMENT,
  email VARCHAR(191) NOT NULL,
  password VARCHAR(191) NULL,
  fname VARCHAR(191) NOT NULL,
  lname VARCHAR(191) NOT NULL,
  department_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  preferred_auth_method VARCHAR(191) NOT NULL DEFAULT 'jwt',
  last_login_at DATETIME(3) NULL,
  client_id VARCHAR(191) NOT NULL,
  client_secret VARCHAR(191) NOT NULL,
  expires_at DATETIME(3) NULL,
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  role_id INT NULL,
  emp_code VARCHAR(20) NULL,
  firebase_uid VARCHAR(191) NULL,
  profile_picture VARCHAR(191) NULL,
  two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
  two_factor_secret VARCHAR(191) NULL,
  backup_codes TEXT NULL,
  two_factor_verified_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY app_users_email_key (email),
  UNIQUE KEY app_users_client_id_key (client_id),
  UNIQUE KEY app_users_emp_code_key (emp_code),
  UNIQUE KEY app_users_firebase_uid_key (firebase_uid),
  KEY idx_user_role_id (role_id),
  KEY idx_user_email (email),
  KEY idx_user_is_active (is_active),
  KEY idx_user_is_admin (is_admin),
  KEY idx_user_department_id (department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ถ้ามี app_users อยู่แล้วแต่ขาดคอลัมน์ — รันเฉพาะบรรทัดที่ยังไม่มี (MySQL 8 ไม่มี IF NOT EXISTS สำหรับ column — ตรวจก่อนรัน)
/*
ALTER TABLE app_users
  ADD COLUMN department_id INT NULL AFTER lname,
  ADD COLUMN client_id VARCHAR(191) NULL AFTER last_login_at,
  ADD COLUMN client_secret VARCHAR(191) NULL AFTER client_id,
  ADD COLUMN expires_at DATETIME(3) NULL AFTER client_secret,
  ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER expires_at,
  ADD COLUMN role_id INT NULL AFTER is_admin,
  ADD COLUMN emp_code VARCHAR(20) NULL AFTER role_id;
*/

-- Path B1: มีแค่ app เดิม คอลัมน์ name) — rename แล้ว alter
/*
RENAME TABLE app_users;
ALTER TABLE app_users
  ADD COLUMN fname VARCHAR(191) NOT NULL DEFAULT '' AFTER password,
  ADD COLUMN lname VARCHAR(191) NOT NULL DEFAULT '-' AFTER fname,
  ADD COLUMN department_id INT NULL AFTER lname,
  ADD COLUMN client_id VARCHAR(191) NULL AFTER last_login_at,
  ADD COLUMN client_secret VARCHAR(191) NULL AFTER client_id,
  ADD COLUMN expires_at DATETIME(3) NULL AFTER client_secret,
  ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 1 AFTER expires_at,
  ADD COLUMN role_id INT NULL AFTER is_admin,
  ADD COLUMN emp_code VARCHAR(20) NULL AFTER role_id;
UPDATE app_users SET
  fname = COALESCE(NULLIF(SUBSTRING_INDEX(TRIM(name), ' ', 1), ''), 'User'),
  lname = COALESCE(NULLIF(TRIM(SUBSTRING(name, LOCATE(' ', TRIM(name)) + 1)), ''), '-'),
  client_id = CONCAT('adm_', id, '_', REPLACE(UUID(), '-', '')),
  client_secret = COALESCE(client_secret, '$2a$10$invalidplaceholderchangeme'),
  is_admin = 1
WHERE name IS NOT NULL;
ALTER TABLE app_users DROP COLUMN name;
ALTER TABLE app_users MODIFY client_id VARCHAR(191) NOT NULL, MODIFY client_secret VARCHAR(191) NOT NULL;
*/

-- -----------------------------------------------------------------------------
-- C) ย้ายข้อมูลเข้า app_users (ตารางใหม่ + ยังมีตารางเก่า)
-- -----------------------------------------------------------------------------

-- C1) Admin จาก app
INSERT INTO app_users (
  email, password, fname, lname, is_active, email_verified, preferred_auth_method,
  last_login_at, client_id, client_secret, is_admin, role_id, emp_code,
  firebase_uid, profile_picture, two_factor_enabled, two_factor_secret,
  backup_codes, two_factor_verified_at, created_at, updated_at
)
SELECT
  u.email,
  u.password,
  COALESCE(NULLIF(SUBSTRING_INDEX(TRIM(u.name), ' ', 1), ''), 'User'),
  COALESCE(NULLIF(TRIM(SUBSTRING(u.name, LOCATE(' ', TRIM(u.name)) + 1)), ''), '-'),
  u.is_active,
  u.email_verified,
  u.preferred_auth_method,
  u.last_login_at,
  CONCAT('adm_', u.id, '_', REPLACE(UUID(), '-', '')),
  COALESCE(u.password, '$2a$10$placeholderhashsetnewpassword'),
  1,
  NULL,
  NULL,
  u.firebase_uid,
  u.profile_picture,
  u.two_factor_enabled,
  u.two_factor_secret,
  u.backup_codes,
  u.two_factor_verified_at,
  u.created_at,
  u.updated_at
FROM app_users u
WHERE NOT EXISTS (SELECT 1 FROM app_users au WHERE au.email = u.email);

-- C2) Staff จาก app_staff_users
INSERT INTO app_users (
  email, password, fname, lname, department_id, is_active, email_verified,
  preferred_auth_method, client_id, client_secret, expires_at, is_admin, role_id,
  created_at, updated_at
)
SELECT
  s.email,
  s.password,
  s.fname,
  s.lname,
  s.department_id,
  s.is_active,
  0,
  'jwt',
  s.client_id,
  s.client_secret,
  s.expires_at,
  0,
  s.role_id,
  s.created_at,
  s.updated_at
FROM app_staff_users s
WHERE NOT EXISTS (SELECT 1 FROM app_users au WHERE au.email = s.email);

-- -----------------------------------------------------------------------------
-- D) ตารางใหม่ — จำกัดแผนกหลักต่อ StaffRole
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_staff_role_permission_departments (
  id INT NOT NULL AUTO_INCREMENT,
  role_id INT NOT NULL,
  department_id INT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uniq_role_department (role_id, department_id),
  KEY idx_srpd_role_id (role_id),
  KEY app_staff_role_permission_departments_department_id_fkey (department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- E) Foreign keys (รันหลังย้ายข้อมูลและมีตาราง department / employee)
-- -----------------------------------------------------------------------------
-- ลบ FK เก่าถ้าชื่อซ้ำแล้วรันใหม่:
-- SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
--   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'app_users';

ALTER TABLE app_users
  ADD CONSTRAINT app_users_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES app_staff_roles(id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT app_users_department_id_fkey
    FOREIGN KEY (department_id) REFERENCES department(ID)
    ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT app_users_emp_code_fkey
    FOREIGN KEY (emp_code) REFERENCES employee(EmpCode)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE app_staff_role_permissions
  ADD CONSTRAINT app_staff_role_permissions_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES app_staff_roles(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE app_staff_role_permission_departments
  ADD CONSTRAINT app_staff_role_permission_departments_role_id_fkey
    FOREIGN KEY (role_id) REFERENCES app_staff_roles(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT app_staff_role_permission_departments_department_id_fkey
    FOREIGN KEY (department_id) REFERENCES department(ID)
    ON DELETE CASCADE ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS = 1;

-- -----------------------------------------------------------------------------
-- F) ตรวจสอบหลัง migrate
-- -----------------------------------------------------------------------------
-- SELECT COUNT(*) AS admin_count FROM app_users WHERE is_admin = 1;
-- SELECT COUNT(*) AS staff_count FROM app_users WHERE is_admin = 0;
-- SELECT * FROM app_staff_roles LIMIT 10;
-- SELECT * FROM app_staff_role_permission_departments LIMIT 10;

-- หมายเหตุ:
-- 1) ถ้า id ระหว่าง admin เดิมกับ staff เดิมชนกัน ต้อง map id ก่อนอัปเดต log ที่ใช้ admin:123 / staff:456
-- 2) FK ในส่วน E อาจ error ถ้ามี role_id/department_id ที่ไม่มีใน master — แก้ข้อมูลก่อนรัน FK
-- 3) หลังยืนยันแล้วค่อย DROP ตารางเก่า (ระวัง):
--    DROP TABLE IF EXISTS app_staff_users;
--    DROP TABLE IF EXISTS app
--    DROP TABLE IF EXISTS app_staff_roles;
--    DROP TABLE IF EXISTS app_staff_role_permissions;
