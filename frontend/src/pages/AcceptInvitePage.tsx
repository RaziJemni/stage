import { useState } from 'react';
import type { FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { Navigate, useSearchParams } from 'react-router';
import { ApiError } from '../auth/api';
import { useAuth } from '../auth/useAuth';
import { AuthError, AuthField, AuthLayout, buttonClass, inputClass } from './LoginPage';

export function AcceptInvitePage() {
  const { identity, acceptInvitation } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(token ? null : 'This invitation link is missing its token.');
  const [submitting, setSubmitting] = useState(false);

  if (identity) return <Navigate to="/" replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      await acceptInvitation(token, password);
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Vayca could not activate this invitation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-[#1C1B18]">Join your team</h1>
      <p className="mt-1 text-sm text-[#78716C]">Choose a password to activate your staff account.</p>
      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <AuthField label="Password (12+ characters)" icon={<KeyRound className="h-4 w-4" />}>
          <input className={inputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} maxLength={128} autoComplete="new-password" />
        </AuthField>
        {error && <AuthError message={error} />}
        <button type="submit" disabled={submitting || !token} className={buttonClass}>{submitting ? 'Activating…' : 'Activate account'}</button>
      </form>
    </AuthLayout>
  );
}
