import { createContext } from 'react';
import type { AuthIdentity } from './types';

export interface RegisterInput {
  company_name: string;
  name: string;
  email: string;
  password: string;
  timezone: string;
}

export interface AuthContextValue {
  identity: AuthIdentity | null;
  loading: boolean;
  startupError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  acceptInvitation: (token: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
