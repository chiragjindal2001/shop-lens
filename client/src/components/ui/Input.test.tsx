import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { Input } from './Input';

function Controlled({ hint, error }: { hint?: string; error?: string }) {
  const [value, setValue] = useState('');
  return <Input label="Password" type="password" placeholder="Create a password" hint={hint} error={error} value={value} onChange={(e) => setValue(e.target.value)} />;
}

describe('Input helper text (hint)', () => {
  it('stays visible while the user types, unlike a placeholder', async () => {
    render(<Controlled hint="At least 8 characters, with a letter and a number." />);
    const field = screen.getByLabelText('Password');
    expect(screen.getByText('At least 8 characters, with a letter and a number.')).toBeInTheDocument();
    expect(field).toHaveAttribute('placeholder', 'Create a password');

    await userEvent.type(field, 'abc');
    expect(field).toHaveValue('abc'); // the placeholder is gone now...
    expect(screen.getByText('At least 8 characters, with a letter and a number.')).toBeVisible(); // ...the rule is not
  });

  it('is announced with the field (aria-describedby), also together with an error', () => {
    const { rerender } = render(<Controlled hint="Use 8 or more characters." />);
    const field = screen.getByLabelText('Password');
    const hint = screen.getByText('Use 8 or more characters.');
    expect(field.getAttribute('aria-describedby')).toBe(hint.id);

    rerender(<Controlled hint="Use 8 or more characters." error="Password needs at least one number" />);
    const error = screen.getByText('Password needs at least one number');
    expect(screen.getByLabelText('Password').getAttribute('aria-describedby')).toBe(`${hint.id} ${error.id}`);
    expect(screen.getByText('Use 8 or more characters.')).toBeInTheDocument(); // the rule is still shown next to the error
    expect(error.className).toContain('text-danger');
  });

  it('without a hint nothing extra is rendered or described', () => {
    render(<Controlled />);
    expect(screen.getByLabelText('Password')).not.toHaveAttribute('aria-describedby');
  });
});
