import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./AuthProvider', () => ({ useAuth: vi.fn() }));
import { ApiError } from '../../lib/http';
import { SLOW_HINT_TEXT } from './useSlowHint';
import { useAuth } from './AuthProvider';
import { ChatPreview } from './ChatPreview';
import { LoginForm } from './LoginForm';
import { ProtectedRoute } from './ProtectedRoute';
import { SignupForm } from './SignupForm';
import { passwordSchema } from '@shared';
import { PASSWORD_MIN_LENGTH } from '@shared/limits';
import { DEMO } from './useDemoLogin';

const auth = (over: Partial<ReturnType<typeof useAuth>> = {}) =>
  vi.mocked(useAuth).mockReturnValue({ user: null, status: 'anon', login: vi.fn(), signup: vi.fn(), logout: vi.fn(), ...over });

const renderLogin = () =>
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/" element={<p>home page</p>} />
      </Routes>
    </MemoryRouter>,
  );
const renderSignup = () =>
  render(
    <MemoryRouter initialEntries={['/signup']}>
      <Routes>
        <Route path="/signup" element={<SignupForm />} />
        <Route path="/" element={<p>home page</p>} />
      </Routes>
    </MemoryRouter>,
  );

const user = () => userEvent.setup({ advanceTimers: (ms) => vi.advanceTimersByTime(ms) });
beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

describe('login page heading', () => {
  it('welcomes a first-time visitor to Shoplens instead of "Welcome back"', () => {
    auth();
    renderLogin();
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome to Shoplens' })).toBeInTheDocument();
    expect(screen.queryByText('Welcome back')).not.toBeInTheDocument();
  });
});

describe('brand panel alignment and footer', () => {
  it('the logo, the content and the footer sit in the same centered column, so they share one left edge', () => {
    auth();
    renderLogin();
    const panel = screen.getByText('Smart gear.', { exact: false }).closest('aside')!;
    const logo = screen.getByText('Shoplens', { selector: 'aside span' }).parentElement!;
    const content = screen.getByText('Smart gear.', { exact: false }).parentElement!;
    const footer = screen.getByText('A demo store. Prices in ₹.');
    for (const el of [logo, content, footer]) {
      expect(el.parentElement).toBe(panel);
      expect(el.className).toContain('mx-auto');
      expect(el.className).toContain('w-full');
      expect(el.className).toContain('max-w-xl'); // identical width + centering = identical left edge
    }
  });

  it('the footer is solid white and not tiny, not a faint translucent line', () => {
    auth();
    renderLogin();
    const footer = screen.getByText('A demo store. Prices in ₹.');
    expect(footer.className).toContain('text-white');
    expect(footer.className).not.toMatch(/text-white\//); // no opacity
    expect(footer.className).not.toContain('text-xs');
  });
});

describe('login page layout', () => {
  it('puts the demo button first, with a hint, then "or log in with your account", then the form', () => {
    auth();
    renderLogin();
    const demo = screen.getByRole('button', { name: /Try the demo account/ });
    const email = screen.getByLabelText('Email');
    const separator = screen.getByRole('separator');
    expect(screen.getByText('One click, no signup. Comes with sample orders.')).toBeInTheDocument();
    expect(separator).toHaveTextContent('or log in with your account');
    // document order: demo button, divider, then the form fields
    expect(demo.compareDocumentPosition(separator) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(separator.compareDocumentPosition(email) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('the demo button is the filled primary action, and Log in is the quieter secondary one', () => {
    auth();
    renderLogin();
    expect(screen.getByRole('button', { name: /Try the demo account/ }).className).toContain('bg-brand-gradient');
    const login = screen.getByRole('button', { name: 'Log in' });
    expect(login.className).not.toContain('bg-brand-gradient');
    expect(login.className).toContain('border-border');
  });

  it('shows the product before login: a static chat preview that is hidden from screen readers and has nothing to click', () => {
    auth();
    const { container } = renderLogin();
    expect(screen.getByText("Where's my order SE1041?")).toBeInTheDocument();
    expect(screen.getByText(/It's shipped and should arrive in 2 days/)).toBeInTheDocument();
    const preview = screen.getByText('The assistant in action').parentElement!;
    expect(preview).toHaveAttribute('aria-hidden', 'true');
    expect(preview.querySelectorAll('button, a, input')).toHaveLength(0);
    expect(container.querySelector('[aria-hidden="true"] button')).toBeNull();
  });

  it('one click on the demo button logs in with the demo account and goes home', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    auth({ login });
    renderLogin();
    await user().click(screen.getByRole('button', { name: /Try the demo account/ }));
    expect(login).toHaveBeenCalledExactlyOnceWith(DEMO);
    expect(await screen.findByText('home page')).toBeInTheDocument();
  });

  it('shows a failed demo login as an error and re-enables the button', async () => {
    auth({ login: vi.fn().mockRejectedValue(new ApiError('Invalid email or password', 401, 'UNAUTHORIZED')) });
    renderLogin();
    await user().click(screen.getByRole('button', { name: /Try the demo account/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(screen.getByRole('button', { name: /Try the demo account/ })).toBeEnabled();
  });

  it('inline validation: errors appear on blur, and a bad form is never submitted', async () => {
    const login = vi.fn();
    auth({ login });
    renderLogin();
    const u = user();
    await u.type(screen.getByLabelText('Email'), 'nope');
    await u.tab();
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    await u.click(screen.getByRole('button', { name: 'Log in' }));
    expect(login).not.toHaveBeenCalled();
  });
});

describe('slow server (free hosting waking up)', () => {
  it('after 3 seconds the demo button explains the wait instead of a silent spinner', async () => {
    auth({ login: vi.fn(() => new Promise<void>(() => {})) }); // never answers
    renderLogin();
    await user().click(screen.getByRole('button', { name: /Try the demo account/ }));
    expect(screen.getByRole('button', { name: /Try the demo account/ })).toBeDisabled(); // pending, but still quick
    expect(screen.queryByText(SLOW_HINT_TEXT)).not.toBeInTheDocument();

    act(() => void vi.advanceTimersByTime(3000));
    expect(screen.getByRole('button', { name: SLOW_HINT_TEXT })).toBeDisabled();
  });

  it('the Log in button explains the wait too', async () => {
    auth({ login: vi.fn(() => new Promise<void>(() => {})) });
    renderLogin();
    const u = user();
    await u.type(screen.getByLabelText('Email'), 'a@b.co');
    await u.type(screen.getByLabelText('Password'), 'Passw0rd!x');
    await u.click(screen.getByRole('button', { name: 'Log in' }));
    expect(screen.queryByText(SLOW_HINT_TEXT)).not.toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(3000));
    expect(screen.getByRole('button', { name: SLOW_HINT_TEXT })).toBeInTheDocument();
  });

  it('a quick answer never shows the message', async () => {
    auth({ login: vi.fn().mockResolvedValue(undefined) });
    renderLogin();
    await user().click(screen.getByRole('button', { name: /Try the demo account/ }));
    act(() => void vi.advanceTimersByTime(10_000));
    expect(screen.queryByText(SLOW_HINT_TEXT)).not.toBeInTheDocument();
  });

  it('the loading screen that restores a session explains the wait too', () => {
    auth({ status: 'loading' });
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<p>home page</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole('status')).toBeInTheDocument(); // the spinner
    expect(screen.queryByText(SLOW_HINT_TEXT)).not.toBeInTheDocument();
    act(() => void vi.advanceTimersByTime(3000));
    expect(screen.getByText(SLOW_HINT_TEXT)).toBeInTheDocument();
  });
});

describe('signup page: password rule helper text', () => {
  const RULE = `At least ${PASSWORD_MIN_LENGTH} characters, with a letter and a number.`;

  it('shows the rule under the password field from the start, and keeps it while the user types', async () => {
    auth();
    renderSignup();
    const field = screen.getByLabelText('Password');
    expect(screen.getByText(RULE)).toBeInTheDocument();
    expect(field.getAttribute('placeholder')).not.toMatch(/characters/); // the rule is no longer hidden in a placeholder

    await user().type(field, 'abc');
    expect(screen.getByText(RULE)).toBeVisible();
  });

  it('is linked to the field, and still visible next to the specific error', async () => {
    auth();
    renderSignup();
    const u = user();
    const field = screen.getByLabelText('Password');
    await u.type(field, 'onlyletters');
    await u.tab();
    const error = await screen.findByText('Password needs at least one number');
    expect(field.getAttribute('aria-describedby')).toBe(`${screen.getByText(RULE).id} ${error.id}`);
    expect(screen.getByText(RULE)).toBeInTheDocument();
  });

  it('states the same number the validation enforces (one shared constant, so they cannot drift apart)', () => {
    const tooShort = 'a1'.repeat(PASSWORD_MIN_LENGTH / 2).slice(0, PASSWORD_MIN_LENGTH - 1);
    const justEnough = 'a1'.repeat(PASSWORD_MIN_LENGTH / 2);
    expect(passwordSchema.safeParse(tooShort).success).toBe(false);
    expect(passwordSchema.safeParse(justEnough).success).toBe(true);
    expect(RULE).toContain(String(PASSWORD_MIN_LENGTH));
  });

  it('only the password field has the rule, not the confirmation field', () => {
    auth();
    renderSignup();
    expect(screen.getAllByText(RULE)).toHaveLength(1);
    expect(screen.getByLabelText('Confirm password')).not.toHaveAttribute('aria-describedby');
  });
});

describe('signup page', () => {
  it('uses the same split layout (brand panel with the chat preview) and has the demo button on top', () => {
    auth();
    renderSignup();
    expect(screen.getByText('The assistant in action')).toBeInTheDocument();
    expect(screen.getByText('Smart gear.', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try the demo account/ }).className).toContain('bg-brand-gradient');
    expect(screen.getByText('One click, no signup. Comes with sample orders.')).toBeInTheDocument();
    expect(screen.getByRole('separator')).toHaveTextContent('or create your own account');
  });

  it('the demo button works from the signup page too', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    auth({ login });
    renderSignup();
    await user().click(screen.getByRole('button', { name: /Try the demo account/ }));
    expect(login).toHaveBeenCalledExactlyOnceWith(DEMO);
    expect(await screen.findByText('home page')).toBeInTheDocument();
  });

  it('inline validation: each rule has its own message, shown on blur', async () => {
    auth();
    renderSignup();
    const u = user();
    await u.type(screen.getByLabelText('Name'), 'A');
    await u.clear(screen.getByLabelText('Name'));
    await u.tab();
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    await u.type(screen.getByLabelText('Email'), 'bad');
    await u.tab();
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    await u.type(screen.getByLabelText('Password'), 'onlyletters');
    await u.tab();
    expect(await screen.findByText('Password needs at least one number')).toBeInTheDocument();
    await u.type(screen.getByLabelText('Confirm password'), 'different1');
    await u.tab();
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
  });

  it('a duplicate email shows the server error, keeps what was typed, and re-enables the button', async () => {
    const signup = vi.fn().mockRejectedValue(new ApiError('An account with this email already exists', 409, 'EMAIL_TAKEN'));
    auth({ signup });
    renderSignup();
    const u = user();
    await u.type(screen.getByLabelText('Name'), 'Asha');
    await u.type(screen.getByLabelText('Email'), 'taken@example.com');
    await u.type(screen.getByLabelText('Password'), 'Passw0rd!x');
    await u.type(screen.getByLabelText('Confirm password'), 'Passw0rd!x');
    await u.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists');
    expect(screen.getByLabelText('Email')).toHaveValue('taken@example.com'); // nothing is lost
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeEnabled();
    expect(screen.queryByText('home page')).not.toBeInTheDocument();
  });

  it('while signing up, the button shows it is busy and both buttons are locked, so nothing is submitted twice', async () => {
    let finish!: () => void;
    const signup = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    auth({ signup });
    renderSignup();
    const u = user();
    await u.type(screen.getByLabelText('Name'), 'Asha');
    await u.type(screen.getByLabelText('Email'), 'asha@example.com');
    await u.type(screen.getByLabelText('Password'), 'Passw0rd!x');
    await u.type(screen.getByLabelText('Confirm password'), 'Passw0rd!x');
    await u.click(screen.getByRole('button', { name: 'Sign up' }));

    const submit = screen.getByRole('button', { name: 'Sign up' });
    expect(submit).toBeDisabled();
    expect(submit.querySelector('svg.animate-spin')).toBeTruthy(); // the spinner
    expect(screen.getByRole('button', { name: /Try the demo account/ })).toBeDisabled();

    finish();
    expect(await screen.findByText('home page')).toBeInTheDocument();
    expect(signup).toHaveBeenCalledOnce();
  });

  it('after 3 seconds the Sign up button explains the wait', async () => {
    auth({ signup: vi.fn(() => new Promise<void>(() => {})) });
    renderSignup();
    const u = user();
    await u.type(screen.getByLabelText('Name'), 'Asha');
    await u.type(screen.getByLabelText('Email'), 'asha@example.com');
    await u.type(screen.getByLabelText('Password'), 'Passw0rd!x');
    await u.type(screen.getByLabelText('Confirm password'), 'Passw0rd!x');
    await u.click(screen.getByRole('button', { name: 'Sign up' }));
    act(() => void vi.advanceTimersByTime(3000));
    await waitFor(() => expect(screen.getByRole('button', { name: SLOW_HINT_TEXT })).toBeInTheDocument());
  });
});

describe('ChatPreview', () => {
  it('is purely decorative', () => {
    const { container } = render(<ChatPreview />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelectorAll('button, a, input, textarea')).toHaveLength(0);
  });
});
