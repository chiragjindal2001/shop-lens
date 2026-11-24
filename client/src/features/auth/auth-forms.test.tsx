import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./AuthProvider', () => ({
  useAuth: vi.fn(),
}));
import { useAuth } from './AuthProvider';
import { ProtectedRoute } from './ProtectedRoute';
import { SignupForm } from './SignupForm';

const mockAuth = (over: Partial<ReturnType<typeof useAuth>>) =>
  vi.mocked(useAuth).mockReturnValue({ user: null, status: 'anon', login: vi.fn(), signup: vi.fn(), logout: vi.fn(), ...over });

describe('SignupForm validation', () => {
  it('shows inline errors on blur and does not submit invalid data', async () => {
    const signup = vi.fn();
    mockAuth({ signup });
    render(<MemoryRouter><SignupForm /></MemoryRouter>);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.tab();
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Password'), 'short');
    await user.tab();
    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Confirm password'), 'different1');
    await user.tab();
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(signup).not.toHaveBeenCalled();
  });

  it('submits valid data', async () => {
    const signup = vi.fn().mockResolvedValue(undefined);
    mockAuth({ signup });
    render(<MemoryRouter><SignupForm /></MemoryRouter>);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Name'), 'Asha');
    await user.type(screen.getByLabelText('Email'), 'Asha@Example.com');
    await user.type(screen.getByLabelText('Password'), 'Passw0rd!x');
    await user.type(screen.getByLabelText('Confirm password'), 'Passw0rd!x');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    await waitFor(() => expect(signup).toHaveBeenCalledWith({ name: 'Asha', email: 'Asha@Example.com', password: 'Passw0rd!x' }));
  });
});

describe('ProtectedRoute', () => {
  const tree = (
    <MemoryRouter initialEntries={['/chat']}>
      <Routes>
        <Route path="/login" element={<div>login page</div>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/chat" element={<div>chat page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

  it('redirects anonymous users to /login', () => {
    mockAuth({ status: 'anon' });
    render(tree);
    expect(screen.getByText('login page')).toBeInTheDocument();
  });
  it('shows a loader (not the login page) while the session is being restored', () => {
    mockAuth({ status: 'loading' });
    render(tree);
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
  it('renders the page for authenticated users', () => {
    mockAuth({ status: 'authed' });
    render(tree);
    expect(screen.getByText('chat page')).toBeInTheDocument();
  });
});
