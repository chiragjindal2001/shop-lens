import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Spinner } from '../../components/ui/Spinner';
import { useAuth } from './AuthProvider';

export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center text-indigo-600">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (status === 'anon') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
