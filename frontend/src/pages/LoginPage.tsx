import { useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, KeyRound, Mail } from 'lucide-react';
import { Link, Navigate, useLocation } from 'react-router';
import { ApiError } from '../auth/api';
import { useAuth } from '../auth/useAuth';
import { VaycaLogo } from '../components/VaycaLogo';

export function LoginPage() {
  const { identity, login } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (identity) {
    const state = location.state as { from?: string } | null;
    return <Navigate to={state?.from ?? '/'} replace />;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
    } catch (caught: unknown) {
      setError(loginErrorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-[#1C1B18] tracking-tight">Welcome back</h1>
      <p className="mt-1 text-sm font-medium text-[#78716C]">Sign in to your Vayca workspace</p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <AuthField label="Work email" icon={<Mail className="h-4 w-4" />}>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className={inputClass}
            placeholder="manager@agency.tn"
          />
        </AuthField>
        <AuthField label="Password" icon={<KeyRound className="h-4 w-4" />}>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className={inputClass}
          />
        </AuthField>
        {error && <AuthError message={error} />}
        <button type="submit" disabled={submitting} className={buttonClass}>
          {submitting ? 'Signing in…' : 'Sign in'}
          {!submitting && <ArrowRight className="h-4 w-4 text-[#E8A838]" />}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-[#78716C]">
        Creating a new company?{' '}
        <Link to="/register" className="font-bold text-[#0F3D5E] hover:underline">Create workspace</Link>
      </p>
    </AuthLayout>
  );
}

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF8F5] p-4 text-[#1C1B18]">
      <div className="w-full max-w-md rounded-2xl border border-[#EBE6DD] bg-white p-8 shadow-[0_8px_30px_rgba(28,27,24,0.06)]">
        <div className="mb-6 flex flex-col items-center text-center">
          <VaycaLogo size="xl" className="mb-3" />
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-[#0F3D5E]">Vayca Tunisia</div>
          <div className="text-[11px] text-[#78716C] font-medium">Vacation Rental Operations</div>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AuthField({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#3B3735]">{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3.5 top-3.5 text-[#78716C]">{icon}</span>
        {children}
      </span>
    </label>
  );
}

export function AuthError({ message }: { message: string }) {
  return <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">{message}</div>;
}

export const inputClass = 'w-full rounded-xl border border-[#EBE6DD] bg-[#FAF8F5] py-2.5 pl-10 pr-4 text-sm text-[#1C1B18] outline-none transition-colors focus:border-[#0F3D5E] focus:bg-white';
export const buttonClass = 'flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F3D5E] px-4 py-3 font-semibold text-white shadow-[0_4px_12px_rgba(15,61,94,0.2)] transition-colors hover:bg-[#0C324E] disabled:cursor-not-allowed disabled:opacity-60';

function loginErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Vayca could not reach the authentication service.';
  if (error.code === 'invalid_credentials') return 'The email address or password is incorrect.';
  if (error.code === 'account_inactive') return 'This account is inactive. Contact your company manager.';
  if (error.code === 'invitation_pending') return 'Accept your invitation before signing in.';
  if (error.code === 'login_rate_limited') return 'Too many attempts. Wait fifteen minutes before trying again.';
  return error.message;
}
