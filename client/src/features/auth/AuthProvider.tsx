import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthResponse, LoginInput, SignupInput, UserDto } from '@shared';
import { http, refreshSession, setAccessToken, setAuthLostHandler } from '../../lib/http';

type Status = 'loading' | 'authed' | 'anon';

interface AuthContextValue {
  user: UserDto | null;
  status: Status;
  login(input: LoginInput): Promise<void>;
  signup(input: SignupInput): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  const accept = useCallback((r: AuthResponse) => {
    setAccessToken(r.accessToken);
    setUser(r.user);
    setStatus('authed');
  }, []);

  // Restore the session on page load, behind a loading screen so /login never flashes.
  useEffect(() => {
    let alive = true;
    refreshSession().then(
      (r) => alive && (setUser(r.user), setStatus('authed')),
      () => alive && (setUser(null), setStatus('anon')),
    );
    setAuthLostHandler(() => {
      setUser(null);
      setStatus('anon');
    });
    return () => {
      alive = false;
      setAuthLostHandler(null);
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      async login(input) {
        accept((await http.post<AuthResponse>('/auth/login', input)).data);
      },
      async signup(input) {
        accept((await http.post<AuthResponse>('/auth/signup', input)).data);
      },
      async logout() {
        try {
          await http.post('/auth/logout');
        } finally {
          setAccessToken(null);
          setUser(null);
          setStatus('anon');
        }
      },
    }),
    [user, status, accept],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
