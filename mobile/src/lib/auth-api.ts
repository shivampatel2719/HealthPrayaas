import { apiRequest } from '@/lib/api-client';

export type Role = 'admin' | 'teacher' | 'health_staff';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: Role;
};

export type LoginResult = {
  accessToken: string;
  user: AuthUser;
};

export function login(email: string, password: string) {
  return apiRequest<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
}

export function getMe(token: string) {
  return apiRequest<AuthUser>('/api/auth/me', { token });
}

export type RegisterInput = {
  email: string;
  password: string;
  fullName: string;
  role: Role;
};

// Admin-only: this school-tool app has no public self-signup. New staff accounts are
// provisioned by an existing admin, matching the backend's requireRole("admin") gate.
export function registerUser(token: string, input: RegisterInput) {
  return apiRequest<AuthUser>('/api/auth/register', { method: 'POST', token, body: input });
}
