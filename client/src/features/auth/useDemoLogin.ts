import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toApiError } from '../../lib/http';
import { useAuth } from './AuthProvider';

export const DEMO = { email: 'demo@shoplens.in', password: 'Demo@1234' };

/** One-click demo login, shared by the login and signup pages. */
export function useDemoLogin(redirectTo = '/') {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      await login(DEMO);
      navigate(redirectTo, { replace: true });
    } catch (e) {
      setError(toApiError(e).message);
      setPending(false);
    }
  }

  return { pending, error, start };
}
