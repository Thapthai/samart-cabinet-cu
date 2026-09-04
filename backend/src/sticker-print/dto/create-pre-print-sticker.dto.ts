import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class PrePrintStickerDetailDto {
  @IsString()
  @MaxLength(25)
  itemcode!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  item_name?: string;

  /** YYYY-MM-DD */
  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== '')
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'expire_date must be YYYY-MM-DD' })
  expire_date?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  copies!: number;

  @IsOptional()
  @IsBoolean()
  is_main?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lot_no?: string;
}

export class CreatePrePrintStickerDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => PrePrintStickerDetailDto)
  lines!: PrePrintStickerDetailDto[];
}
