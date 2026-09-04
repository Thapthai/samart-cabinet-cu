import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/** สร้างอุปกรณ์จากหน้าเตรียมพิมพ์สติ๊กเกอร์ — กรอกเฉพาะรหัสที่แสดง (itemcode2) และชื่อ */
export class CreatePrePrintItemDto {
  @IsString()
  @IsNotEmpty({ message: 'itemcode2 ต้องไม่ว่าง' })
  @MaxLength(20, { message: 'itemcode2 ต้องไม่เกิน 20 ตัวอักษร' })
  itemcode2: string;

  @IsString()
  @MinLength(2, { message: 'ชื่ออุปกรณ์ต้องมีอย่างน้อย 2 ตัวอักษร' })
  @MaxLength(255, { message: 'ชื่ออุปกรณ์ต้องไม่เกิน 255 ตัวอักษร' })
  itemname: string;
}
