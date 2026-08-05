import { userEvent } from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PasswordInput } from '@/components/primitives/PasswordInput';
import { renderWithProviders } from '../../../support/render';

/**
 * `Input` deliberately refuses `type="password"` — it wanted a reveal
 * affordance of its own, and this is it (WCAG 2.2 SC 3.3.8).
 */

function render() {
  return renderWithProviders(
    <PasswordInput hideLabel="Hide password" label="Password" revealLabel="Show password" />,
  );
}

describe('PasswordInput', () => {
  it('masks by default', () => {
    render();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('reveals and re-masks', async () => {
    const user = userEvent.setup();
    render();

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('states the CURRENT condition, not just the next action', () => {
    render();

    // A label that only ever names the next action never tells a screen-reader
    // user that the password is currently visible on their screen.
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('does not submit the form it sits in', async () => {
    const user = userEvent.setup();
    let submitted = false;

    renderWithProviders(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted = true;
        }}
      >
        <PasswordInput hideLabel="Hide password" label="Password" revealLabel="Show password" />
      </form>,
    );

    // `type="button"`. The default is `submit`, which would post the sign-in
    // form every time someone checked what they had typed.
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(submitted).toBe(false);
  });

  it('associates its error with the field', () => {
    renderWithProviders(
      <PasswordInput
        error="Enter your password."
        hideLabel="Hide password"
        label="Password"
        revealLabel="Show password"
      />,
    );

    const field = screen.getByLabelText('Password');
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(field).toHaveAccessibleDescription('Enter your password.');
  });

  it('renders no text the caller did not supply', () => {
    // The `contract.test.tsx` rule, applied to the newest primitive: every
    // user-visible string arrives as a required prop.
    const { container } = render();
    const text = container.textContent ?? '';

    expect(text.replace('Password', '').replace('Show password', '').trim()).toBe('');
  });
});
