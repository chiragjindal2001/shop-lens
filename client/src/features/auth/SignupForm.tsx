import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signupFormSchema } from '@shared';
import { PASSWORD_MIN_LENGTH } from '@shared/limits';
import { Banner } from '../../components/ui/Banner';
import { Input } from '../../components/ui/Input';
import { toApiError } from '../../lib/http';
import { AuthShell } from './AuthShell';
import { useAuth } from './AuthProvider';
import { DemoButton, OrDivider } from './DemoButton';
import { SubmitButton } from './SubmitButton';
import { useDemoLogin } from './useDemoLogin';
import { useZodForm } from './useZodForm';

export function SignupForm() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const demo = useDemoLogin('/');
  const form = useZodForm(signupFormSchema, { name: '', email: '', password: '', confirmPassword: '' });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    form.touchAll();
    if (!form.isValid) return;
    setPending(true);
    setError(null);
    try {
      const { name, email, password } = form.values;
      await signup({ name, email, password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(toApiError(err).message);
      setPending(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="We'll add a few sample orders so you can try the assistant right away.">
      {/* The same main action as the login page, so a visitor who landed here can still just look around. */}
      <div className="space-y-3">
        {demo.error && <Banner>{demo.error}</Banner>}
        <DemoButton pending={demo.pending} disabled={pending} onClick={() => void demo.start()} />
      </div>

      <OrDivider>or create your own account</OrDivider>

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <Banner>{error}</Banner>}
        <Input label="Name" autoComplete="name" placeholder="Your name" {...form.field('name')} />
        <Input label="Email" type="email" autoComplete="email" placeholder="you@example.com" {...form.field('email')} />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="Create a password"
          hint={`At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`}
          {...form.field('password')}
        />
        <Input label="Confirm password" type="password" autoComplete="new-password" placeholder="Repeat your password" {...form.field('confirmPassword')} />
        <SubmitButton label="Sign up" pending={pending} disabled={demo.pending} />
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
