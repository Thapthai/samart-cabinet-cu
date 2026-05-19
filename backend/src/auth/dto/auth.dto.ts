import { IsEmail, IsNotEmpty, IsString, IsOptional, IsEnum, IsInt, MinLength, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export enum AuthMethod {
  JWT = 'jwt',
  API_KEY = 'api_key',
  BASIC = 'basic',
  FIREBASE = 'firebase'
}

/** POST /auth/register/admin */
export class RegisterAdminDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).+$/, {
    message: 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักษรพิเศษ',
  })
  password: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  fname: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  lname: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  department_id?: number;

  @IsOptional()
  @IsString()
  emp_code?: string;
}

/** POST /auth/register/staff */
export class RegisterStaffDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  fname: string;

  @IsString()
  @MinLength(2)
  lname: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).+$/, {
    message: 'รหัสผ่านต้องมีตัวพิมพ์ใหญ่ ตัวพิมพ์เล็ก ตัวเลข และอักษรพิเศษ',
  })
  password: string;

  /** รับได้ทั้ง role_id หรือ role (alias) */
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
  expires_at?: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsEnum(AuthMethod)
  auth_method?: AuthMethod;
}

export class FirebaseLoginDto {
  @IsNotEmpty()
  @IsString()
  idToken: string;
}

export class ApiKeyCreateDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  expires_at?: string;
}

export class UpdateClientCredentialDto {
  @IsOptional()
  expires_at?: string | null;
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refresh_token: string;
}

export class Enable2FADto {
  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsEnum({ totp: 'totp', email_otp: 'email_otp', backup_code: 'backup_code' } as any)
  type?: string;
}

export class Verify2FASetupDto {
  @IsNotEmpty()
  @IsString()
  secret: string;

  @IsNotEmpty()
  @IsString()
  token: string;
}

export class Disable2FADto {
  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  token?: string;
}

export class Verify2FADto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsOptional()
  type?: string;
}

export class Generate2FABackupCodesDto {
  @IsNotEmpty()
  @IsString()
  password: string;
}

export class SendEmailOTPDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}

export class LoginWith2FADto {
  @IsNotEmpty()
  @IsString()
  tempToken: string;

  @IsNotEmpty()
  @IsString()
  code: string;

  @IsOptional()
  type?: string;
}

export class ChangePasswordDto {
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร' })
  newPassword: string;

  @IsNotEmpty()
  @IsString()
  confirmPassword: string;
}

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(AuthMethod)
  preferred_auth_method?: AuthMethod;

  @IsOptional()
  @IsString()
  currentPassword?: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;
}

export class ConfirmResetPasswordDto {
  @IsNotEmpty()
  @IsString()
  token: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).+$/)
  newPassword: string;

  @IsNotEmpty()
  @IsString()
  confirmPassword: string;
}
