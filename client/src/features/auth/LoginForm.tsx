import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema } from '@shared';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toApiError } from '../../lib/http';
import { AuthShell } from './AuthShell';
import { useAuth } from './AuthProvider';
import { useZodForm } from './useZodForm';

export const DEMO = { email: 'demo@shoplens.in', password: 'Demo@1234' };

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/chat';
  const form = useZodForm(loginSchema, { email: '', password: '' });
  const [pending, setPending] = useState<'login' | 'demo' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: 'login' | 'demo', creds: { email: string; password: string }) {
    setPending(kind);
    setError(null);
    try {
      await login(creds);
      navigate(from, { replace: true });
    } catch (e) {
      setError(toApiError(e).message);
      setPending(null);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    form.touchAll();
    if (form.isValid) void run('login', form.values);
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to chat with Shoplens Support">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <Banner>{error}</Banner>}
        <Input label="Email" type="email" autoComplete="email" {...form.field('email')} />
        <Input label="Password" type="password" autoComplete="current-password" {...form.field('password')} />
        <Button type="submit" className="w-full" loading={pending === 'login'} disabled={pending !== null}>
          Log in
        </Button>
        <Button type="button" variant="secondary" className="w-full" loading={pending === 'demo'} disabled={pending !== null} onClick={() => run('demo', DEMO)}>
          Try the demo account
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        New here?{' '}
        <Link to="/signup" className="font-medium text-indigo-600 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
