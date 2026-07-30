import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AUTHENTICATION_REQUIRED_EVENT, ApiError, apiRequest } from './api';
import type { AuthIdentity } from './types';
import { AuthContext } from './context';
import type { RegisterInput } from './context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<AuthIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [startupError, setStartupError] = useState<string | null>(null);

  useEffect(() => {
    const clearExpiredIdentity = () => setIdentity(null);
    window.addEventListener(AUTHENTICATION_REQUIRED_EVENT, clearExpiredIdentity);
    apiRequest<AuthIdentity>('/api/v1/auth/me')
      .then(setIdentity)
      .catch((error: unknown) => {
        if (!(error instanceof ApiError) || error.status !== 401) {
          setStartupError('Vayca could not verify your session. Check the API connection.');
        }
      })
      .finally(() => setLoading(false));
    return () => window.removeEventListener(AUTHENTICATION_REQUIRED_EVENT, clearExpiredIdentity);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<AuthIdentity>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setIdentity(result);
    setStartupError(null);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const result = await apiRequest<AuthIdentity>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    setIdentity(result);
    setStartupError(null);
  }, []);

  const acceptInvitation = useCallback(async (token: string, password: string) => {
    const result = await apiRequest<AuthIdentity>('/api/v1/auth/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
    setIdentity(result);
    setStartupError(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest<void>('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      setIdentity(null);
    }
  }, []);

  const value = useMemo(
    () => ({ identity, loading, startupError, login, register, acceptInvitation, logout }),
    [identity, loading, startupError, login, register, acceptInvitation, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
