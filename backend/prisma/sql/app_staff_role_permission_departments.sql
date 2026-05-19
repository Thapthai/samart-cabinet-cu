-- สร้างตารางจำกัดแผนกต่อ Staff Role (รันครั้งเดียวบน DB ที่ยังไม่มีตาราง)
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS app_staff_role_permission_departments (
  id INT NOT NULL AUTO_INCREMENT,
  role_id INT NOT NULL,
  department_id INT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uniq_role_department (role_id, department_id),
  KEY idx_srpd_role_id (role_id),
  KEY idx_srpd_department_id (department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
