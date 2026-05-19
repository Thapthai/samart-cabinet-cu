/** ผู้ใช้จาก session / API login (รวม app_users) */
export type AuthUserLike = {
  is_admin?: boolean;
  userType?: 'admin' | 'staff' | string;
  role_id?: number | null;
  role?: string | number | { code?: string; name?: string } | null;
  role_code?: string | null;
} | null | undefined;

export function isAdminUser(user: AuthUserLike): boolean {
  if (!user) return false;
  if (user.is_admin === true) return true;
  if (user.userType === 'admin') return true;
  const role = user.role;
  if (role === 'admin' || user.role_code === 'admin') return true;
  if (role != null && typeof role === 'object' && (role.code === 'admin' || role.name === 'admin')) return true;
  return false;
}

export function isStaffUser(user: AuthUserLike): boolean {
  if (!user) return false;
  if (user.is_admin === false) return true;
  if (user.userType === 'staff') return true;
  return false;
}
