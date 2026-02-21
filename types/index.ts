export type UserRole = 'student' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface AuthSession {
  user: UserProfile;
  session: { access_token: string; refresh_token?: string; expires_at?: number };
}
