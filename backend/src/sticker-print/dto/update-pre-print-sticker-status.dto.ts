import { IsIn, IsString } from 'class-validator';

/** สถานะเอกสารเตรียมพิมพ์: PREPARED = ยังไม่พิมพ์, PRINTED = พิมพ์แล้ว */
export const PRE_PRINT_STICKER_STATUSES = ['PREPARED', 'PRINTED'] as const;
export type PrePrintStickerStatus = (typeof PRE_PRINT_STICKER_STATUSES)[number];

export class UpdatePrePrintStickerStatusDto {
  @IsString()
  @IsIn(PRE_PRINT_STICKER_STATUSES, {
    message: 'status ต้องเป็น PREPARED หรือ PRINTED',
  })
  status!: PrePrintStickerStatus;
}
