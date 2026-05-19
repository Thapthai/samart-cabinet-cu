-- =============================================================================
-- ประเภทตู้: app_cabinets_type
-- ใช้คู่กับ app_cabinets.cabinet_type (FK -> code)
-- รันใน MariaDB / MySQL หลังสำรองข้อมูลแล้ว
-- =============================================================================

-- 1) สร้างตาราง
CREATE TABLE IF NOT EXISTS `appe` (
  `code` VARCHAR(64) NOT NULL,
  `name_th` VARCHAR(255) NULL,
  `name_en` VARCHAR(255) NULL,
  `has_expiry` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'RFID: ใช้วันหมดอายุ; WEIGHING: ปกติ false',
  `show_rfid_code` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'แสดง/ใช้ RFID code',
  `description` TEXT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2) ข้อมูลเริ่มต้น 2 ประเภท (รันซ้ำได้ — อัปเดตชื่อถ้ามีแล้ว)
INSERT INTO `app_cabinets_type`
  (`code`, `name_th`, `name_en`, `has_expiry`, `show_rfid_code`, `sort_order`, `is_active`)
VALUES
  ('WEIGHING', 'ตู้ชั่ง (Weighing)', 'Weighing', 0, 0, 1, 1),
  ('RFID', 'ตู้ RFID', 'RFID', 1, 1, 2, 1)
ON DUPLICATE KEY UPDATE
  `name_th`       = VALUES(`name_th`),
  `name_en`       = VALUES(`name_en`),
  `has_expiry`    = VALUES(`has_expiry`),
  `show_rfid_code` = VALUES(`show_rfid_code`),
  `sort_order`    = VALUES(`sort_order`),
  `is_active`     = VALUES(`is_active`);

-- =============================================================================
-- 3) (แนะนำ) จัดรูปแบบ cabinet_type ให้ตรงกับ code ก่อนใส่ FK
--    แก้ mapping ตามข้อมูลจริงของคุณ แล้วค่อย uncomment รัน
-- =============================================================================
-- UPDATE `app_cabinets` SET `cabinet_type` = 'WEIGHING' WHERE LOWER(TRIM(`cabinet_type`)) IN ('weighing', 'weight', 'ตู้ชั่ง');
-- UPDATE `app_cabinets` SET `cabinet_type` = 'RFID'     WHERE LOWER(TRIM(`cabinet_type`)) IN ('rfid');
-- UPDATE `app_cabinets` SET `cabinet_type` = UPPER(TRIM(`cabinet_type`)) WHERE `cabinet_type` IS NOT NULL AND `cabinet_type` <> '';

-- ตรวจค่าที่ยังไม่มีใน master (ต้องแก้หรือตั้ง NULL ก่อน add FK)
-- SELECT DISTINCT c.`cabinet_type`
-- FROM `app_cabinets` c
-- LEFT JOIN `app_cabinets_type` t ON t.`code` = c.`cabinet_type`
-- WHERE c.`cabinet_type` IS NOT NULL AND t.`code` IS NULL;

-- =============================================================================
-- 4) Foreign key จากตู้ -> ประเภท
--    รันเมื่อทุกแถวใน app_cabinets.cabinet_type เป็น NULL หรือตรงกับ code ใน master แล้ว
--    ถ้า Prisma migrate สร้าง FK ให้แล้ว ไม่ต้องรันบล็อกนี้
--    ถ้า error 1826 (constraint มีแล้ว): DROP FOREIGN KEY ตามชื่อจริงจาก SHOW CREATE TABLE ก่อน
-- =============================================================================
-- ALTER TABLE `app_cabinets`
--   ADD CONSTRAINT `fk_app_cabinets_cabinet_type`
--     FOREIGN KEY (`cabinet_type`) REFERENCES `appe` (`code`)
--     ON UPDATE CASCADE
--     ON DELETE RESTRICT;
