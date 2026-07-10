const REMEMBER_KEY = 'pose_login_remember';
const EMAIL_KEY = 'pose_login_email';
const PASSWORD_KEY = 'pose_login_password';

export type SavedLoginCredentials = {
  email: string;
  password: string;
};

export function loadSavedLoginCredentials(): SavedLoginCredentials | null {
  if (typeof window === 'undefined') return null;
  if (localStorage.getItem(REMEMBER_KEY) !== '1') return null;

  const email = localStorage.getItem(EMAIL_KEY) ?? '';
  const password = localStorage.getItem(PASSWORD_KEY) ?? '';
  if (!email && !password) return null;

  return { email, password };
}

export function isLoginRememberEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(REMEMBER_KEY) === '1';
}

export function saveLoginCredentials(email: string, password: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REMEMBER_KEY, '1');
  localStorage.setItem(EMAIL_KEY, email);
  localStorage.setItem(PASSWORD_KEY, password);
}

export function clearLoginCredentials() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(REMEMBER_KEY);
  localStorage.removeItem(EMAIL_KEY);
  localStorage.removeItem(PASSWORD_KEY);
}
