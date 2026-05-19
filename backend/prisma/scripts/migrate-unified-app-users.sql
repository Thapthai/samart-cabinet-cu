-- รวม appmicroservice_staff_users -> app_users
-- รัน backup ก่อนใช้งาน production

CREATE TABLE IF NOT EXISTS app_users (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(191) NOT NULL UNIQUE,
  password VARCHAR(191) NULL,
  fname VARCHAR(191) NOT NULL,
  lname VARCHAR(191) NOT NULL,
  department_id INT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  email_verified TINYINT(1) NOT NULL DEFAULT 0,
  preferred_auth_method VARCHAR(191) NOT NULL DEFAULT 'jwt',
  last_login_at DATETIME(3) NULL,
  client_id VARCHAR(191) NOT NULL UNIQUE,
  client_secret VARCHAR(191) NOT NULL,
  expires_at DATETIME(3) NULL,
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  role_id INT NULL,
  emp_code VARCHAR(20) NULL UNIQUE,
  firebase_uid VARCHAR(191) NULL UNIQUE,
  profile_picture VARCHAR(191) NULL,
  two_factor_enabled TINYINT(1) NOT NULL DEFAULT 0,
  two_factor_secret VARCHAR(191) NULL,
  backup_codes TEXT NULL,
  two_factor_verified_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL,
  INDEX idx_user_role_id (role_id),
  INDEX idx_user_email (email),
  INDEX idx_user_is_active (is_active),
  INDEX idx_user_is_admin (is_admin),
  INDEX idx_user_department_id (department_id)
);

-- Admin จากตารางเดิม (ปรับ client_id/secret ถ้ามี helper generate ในแอป)
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
  '$2a$10$placeholderhashreplaceonfirstlogin',
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
FROM app
WHERE NOT EXISTS (SELECT 1 FROM app_users au WHERE au.email = u.email);

-- Staff จากตารางเดิม
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

-- หลัง migrate: อัปเดต FK ที่อ้าง user_id ถ้า id เปลี่ยน (แนะนำ map id แยกตารางชั่วคราวถ้า id ชนกัน)
