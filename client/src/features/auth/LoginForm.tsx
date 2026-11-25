import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema } from '@shared';
import { Banner } from '../../components/ui/Banner';
import { Input } from '../../components/ui/Input';
import { toApiError } from '../../lib/http';
import { AuthShell } from './AuthShell';
import { useAuth } from './AuthProvider';
import { DemoButton, OrDivider } from './DemoButton';
import { SubmitButton } from './SubmitButton';
import { useDemoLogin } from './useDemoLogin';
import { useZodForm } from './useZodForm';

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/';
  const demo = useDemoLogin(from);
  const form = useZodForm(loginSchema, { email: '', password: '' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    form.touchAll();
    if (!form.isValid) return;
    setPending(true);
    setError(null);
    try {
      await login(form.values);
      navigate(from, { replace: true });
    } catch (err) {
      setError(toApiError(err).message);
      setPending(false);
    }
  }

  return (
    <AuthShell title="Welcome to Shoplens" subtitle="Log in to shop and chat with the Shoplens assistant.">
      {/* Most visitors want to look around, so the demo is the main action and the form comes second. */}
      <div className="space-y-3">
        {demo.error && <Banner>{demo.error}</Banner>}
        <DemoButton pending={demo.pending} disabled={pending} onClick={() => void demo.start()} />
      </div>

      <OrDivider>or log in with your account</OrDivider>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <Banner>{error}</Banner>}
        <Input label="Email" type="email" autoComplete="email" placeholder="you@example.com" {...form.field('email')} />
        <Input label="Password" type="password" autoComplete="current-password" placeholder="Your password" {...form.field('password')} />
        <SubmitButton label="Log in" pending={pending} disabled={demo.pending} />
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New here?{' '}
        <Link to="/signup" className="font-semibold text-brand hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
