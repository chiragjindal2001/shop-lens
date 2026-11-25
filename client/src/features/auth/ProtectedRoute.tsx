import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LogoMark } from '../../components/ui/Logo';
import { Spinner } from '../../components/ui/Spinner';
import { SLOW_HINT_TEXT, useSlowHint } from './useSlowHint';
import { useAuth } from './AuthProvider';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  const loading = status === 'loading';
  const slow = useSlowHint(loading);

  if (loading) {
    // Shown while the session is restored, so the login page never flashes.
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-4 px-6 text-center text-brand">
        <LogoMark size={44} className="animate-pulse" />
        <Spinner className="h-5 w-5" />
        {slow && (
          <p className="max-w-xs text-sm text-muted" aria-live="polite">
            {SLOW_HINT_TEXT}
          </p>
        )}
      </div>
    );
  }
  if (status === 'anon') return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}
