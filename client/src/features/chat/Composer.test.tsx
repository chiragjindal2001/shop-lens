import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MAX_MESSAGE_LENGTH } from '@shared';
import { Composer } from './Composer';

const setup = (over: Partial<Parameters<typeof Composer>[0]> = {}) => {
  const onSend = vi.fn();
  const onStop = vi.fn();
  render(<Composer streaming={false} onSend={onSend} onStop={onStop} {...over} />);
  return { onSend, onStop, box: screen.getByLabelText('Message') };
};

describe('Composer', () => {
  it('sends the trimmed text on Enter and clears the box', async () => {
    const { onSend, box } = setup();
    await userEvent.type(box, '  where is my order?  {Enter}');
    expect(onSend).toHaveBeenCalledExactlyOnceWith('where is my order?');
    expect(box).toHaveValue('');
  });

  it('Shift+Enter adds a new line instead of sending', async () => {
    const { onSend, box } = setup();
    await userEvent.type(box, 'line one{Shift>}{Enter}{/Shift}line two');
    expect(onSend).not.toHaveBeenCalled();
    expect(box).toHaveValue('line one\nline two');
  });

  it('the Send button is disabled until there is text, and nothing blank is ever sent', async () => {
    const { onSend, box } = setup();
    const send = screen.getByRole('button', { name: 'Send' });
    expect(send).toBeDisabled();
    await userEvent.type(box, '   {Enter}');
    expect(onSend).not.toHaveBeenCalled();
    await userEvent.type(box, 'hi');
    expect(send).toBeEnabled();
  });

  it('refuses messages over the limit and shows the counter only when close to it', async () => {
    const { onSend, box } = setup();
    expect(screen.queryByText(new RegExp(`/${MAX_MESSAGE_LENGTH}$`))).not.toBeInTheDocument();
    await userEvent.click(box);
    await userEvent.paste('x'.repeat(MAX_MESSAGE_LENGTH + 5));
    expect(screen.getByText(`${MAX_MESSAGE_LENGTH + 5}/${MAX_MESSAGE_LENGTH}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send' })).toBeDisabled();
    await userEvent.keyboard('{Enter}');
    expect(onSend).not.toHaveBeenCalled();
  });

  it('while a reply streams: the box is locked and Stop replaces Send', async () => {
    const { onStop, box } = setup({ streaming: true });
    expect(box).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Send' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onStop).toHaveBeenCalledOnce();
  });
});
