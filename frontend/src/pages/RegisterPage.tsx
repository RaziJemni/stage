import { useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, KeyRound, Mail, UserRound } from 'lucide-react';
import { Link, Navigate } from 'react-router';
import { ApiError } from '../auth/api';
import { useAuth } from '../auth/useAuth';
import { AuthError, AuthField, AuthLayout, buttonClass, inputClass } from './LoginPage';

export function RegisterPage() {
  const { identity, register } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (identity) return <Navigate to="/" replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await register({ company_name: companyName, name, email, password, timezone: 'Africa/Tunis' });
    } catch (caught: unknown) {
      setError(caught instanceof ApiError ? caught.message : 'Vayca could not create the workspace.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-[#1C1B18]">Create your workspace</h1>
      <p className="mt-1 text-sm text-[#78716C]">The first account becomes the company manager.</p>
      <form onSubmit={handleSubmit} className="mt-7 space-y-3.5">
        <AuthField label="Company name" icon={<Building2 className="h-4 w-4" />}>
          <input className={inputClass} value={companyName} onChange={(event) => setCompanyName(event.target.value)} required minLength={2} />
        </AuthField>
        <AuthField label="Your name" icon={<UserRound className="h-4 w-4" />}>
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} required minLength={2} autoComplete="name" />
        </AuthField>
        <AuthField label="Work email" icon={<Mail className="h-4 w-4" />}>
          <input className={inputClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
        </AuthField>
        <AuthField label="Password (12+ characters)" icon={<KeyRound className="h-4 w-4" />}>
          <input className={inputClass} type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={12} maxLength={128} autoComplete="new-password" />
        </AuthField>
        {error && <AuthError message={error} />}
        <button type="submit" disabled={submitting} className={buttonClass}>{submitting ? 'Creating workspace…' : 'Create workspace'}</button>
      </form>
      <p className="mt-6 text-center text-xs text-[#78716C]">Already registered? <Link to="/login" className="font-bold text-[#0F3D5E] hover:underline">Sign in</Link></p>
    </AuthLayout>
  );
}
