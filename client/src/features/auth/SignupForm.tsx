import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signupFormSchema } from '@shared';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toApiError } from '../../lib/http';
import { AuthShell } from './AuthShell';
import { useAuth } from './AuthProvider';
import { useZodForm } from './useZodForm';

export function SignupForm() {
  const { signup } = useAuth();
  const navigate = useNavigate();
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
      navigate('/chat', { replace: true });
    } catch (err) {
      setError(toApiError(err).message);
      setPending(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="We'll add a few sample orders so you can try the assistant">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {error && <Banner>{error}</Banner>}
        <Input label="Name" autoComplete="name" {...form.field('name')} />
        <Input label="Email" type="email" autoComplete="email" {...form.field('email')} />
        <Input label="Password" type="password" autoComplete="new-password" {...form.field('password')} />
        <Input label="Confirm password" type="password" autoComplete="new-password" {...form.field('confirmPassword')} />
        <Button type="submit" className="w-full" loading={pending}>
          Sign up
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-indigo-600 hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
