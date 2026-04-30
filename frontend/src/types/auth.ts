// Auth & User Types

export interface User {
  id: number;
  email: string;
  name: string;
  profile_image?: string;
  profile_picture?: string;
  twoFactorEnabled: boolean;
  preferredAuthMethod?: string; // 'jwt' | 'oauth2' | 'firebase' | 'api_key'
  hasPassword?: boolean; // true if user has password (for JWT users)
  createdAt?: string;
  updatedAt?: string;
  accessToken?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  accessToken?: string;
  tempToken?: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  profile_image?: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

/** แถวจาก GET /auth/admin-users (ไม่มีรหัสผ่าน) */
export interface AdminJwtUserRow {
  id: number;
  email: string;
  name: string;
  is_active: boolean;
  email_verified: boolean;
  preferred_auth_method: string;
  last_login_at: string | null;
  two_factor_enabled: boolean;
  has_password: boolean;
  created_at: string;
  updated_at: string;
}

