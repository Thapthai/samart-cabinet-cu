import { IsEmail, IsString, IsOptional, IsBoolean, IsNumber, IsInt, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class StaffLoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  roleType?: string;
}

export class CreateStaffUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  fname: string;

  @IsString()
  @MinLength(2)
  lname: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  role_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  role?: number;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  expires_at?: string;
}

export class UpdateStaffUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  fname?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  lname?: string;

  @IsOptional()
  @IsString()
  role_code?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  role_id?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  department_id?: number | null;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  expires_at?: string;
}

export class RegenerateClientSecretDto {
  @IsOptional()
  @IsString()
  expires_at?: string;
}
