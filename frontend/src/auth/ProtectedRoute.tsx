import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './useAuth';

export function ProtectedRoute() {
  const { identity, loading, startupError } = useAuth();
  const location = useLocation();
  if (loading) {
    return <AuthState title="Checking your session" detail="Connecting to your Vayca workspace…" />;
  }
  if (startupError) {
    return <AuthState title="Session check failed" detail={startupError} />;
  }
  if (!identity) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

function AuthState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4">
      <div className="rounded-2xl border border-[#EBE6DD] bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-bold text-[#1C1B18]">{title}</h1>
        <p className="mt-2 text-sm text-[#78716C]">{detail}</p>
      </div>
    </div>
  );
}
