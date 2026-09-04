-- ตารางเตรียมพิมพ์สติ๊กเกอร์ (รันครั้งเดียวบน DB ที่ยังไม่มีตาราง)
-- ต้องรันตารางหัวเอกสารก่อน เพราะตารางรายละเอียดอ้างอิงถึง

CREATE TABLE IF NOT EXISTS `app_pre_print_stickers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `doc_no` VARCHAR(32) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PREPARED',
  `remark` TEXT NULL,
  `total_lines` INT NOT NULL DEFAULT 0,
  `total_sheets` INT NOT NULL DEFAULT 0,
  `created_by_user_id` INT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `app_pre_print_stickers_doc_no_key` (`doc_no`),
  KEY `app_pre_print_stickers_created_at_idx` (`created_at`),
  KEY `app_pre_print_stickers_status_idx` (`status`),
  CONSTRAINT `app_pre_print_stickers_created_by_user_id_fkey`
    FOREIGN KEY (`created_by_user_id`) REFERENCES `app_users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `app_pre_print_sticker_details` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `pre_print_sticker_id` INT NOT NULL,
  `line_order` INT NOT NULL DEFAULT 0,
  `itemcode` VARCHAR(25) NOT NULL,
  `item_name` VARCHAR(255) NULL,
  `expire_date` DATE NULL,
  `copies` INT NOT NULL DEFAULT 1,
  `is_main` TINYINT(1) NOT NULL DEFAULT 0,
  `lot_no` VARCHAR(50) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `app_pre_print_sticker_details_pre_print_sticker_id_idx` (`pre_print_sticker_id`),
  KEY `app_pre_print_sticker_details_itemcode_idx` (`itemcode`),
  CONSTRAINT `app_pre_print_sticker_details_pre_print_sticker_id_fkey`
    FOREIGN KEY (`pre_print_sticker_id`) REFERENCES `app_pre_print_stickers` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `app_pre_print_sticker_details_itemcode_fkey`
    FOREIGN KEY (`itemcode`) REFERENCES `item` (`itemcode`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
