export type UserRole = 'manager' | 'staff';
export type UserStatus = 'invited' | 'active' | 'inactive';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
}

export interface AuthCompany {
  id: string;
  name: string;
  timezone: string;
  default_currency: string;
}

export interface AuthIdentity {
  user: AuthUser;
  company: AuthCompany;
  permissions: string[];
}

export interface TeamMember extends AuthUser {
  last_login_at: string | null;
  invitation_expires_at: string | null;
}

export interface ProblemDetail {
  title: string;
  detail: string;
  status: number;
  code: string;
}
