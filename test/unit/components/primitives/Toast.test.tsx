import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CircleCheck } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/primitives/Button';
import { ToastProvider } from '@/components/primitives/Toast';
import { useToast, type ToastOptions } from '@/components/primitives/internal/toast-context';
import { renderWithProviders } from '../../../support/render';

/**
 * Toast is imperative, so every test drives it the way the app will: mount the
 * provider, press something, assert what was announced.
 *
 * The harness components below are local to this file, which is allowed —
 * `react-refresh/only-export-components` skips `*.test.tsx` entirely.
 */

function Raise(options: ToastOptions) {
  const { toast } = useToast();

  return (
    <Button
      onClick={() => {
        toast(options);
      }}
    >
      Raise
    </Button>
  );
}

function Harness(options: ToastOptions) {
  return (
    <ToastProvider closeLabel="Dismiss" viewportLabel="Notifications">
      <Raise {...options} />
    </ToastProvider>
  );
}

describe('<ToastProvider />', () => {
  it('raises a toast into a named region', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness title="Balancing version published" />);

    await user.click(screen.getByRole('button', { name: 'Raise' }));

    // The visible toast is an <li> inside a labelled region — NOT the
    // `role="status"` element Radix also renders, which is a separate
    // visually-hidden announcement clone and is empty until a frame passes.
    // Asserting on that one is how this test would pass while showing nothing.
    expect(await screen.findByRole('listitem')).toHaveTextContent('Balancing version published');
    expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
  });

  it('names its region from a prop, not from Radix English', () => {
    renderWithProviders(<Harness title="Saved" />);

    // Radix defaults the viewport label to the hard-coded "Notifications
    // ({hotkey})". That string would ship untranslated, so `viewportLabel` is
    // required — the same rule that makes IconButton demand a label.
    expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /F8/ })).not.toBeInTheDocument();
  });

  it('shows a description alongside the title', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Harness description="Version 12 is now active." title="Balancing version published" />,
    );

    await user.click(screen.getByRole('button', { name: 'Raise' }));

    expect(await screen.findByText('Version 12 is now active.')).toBeVisible();
  });

  it('dismisses from its close button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness title="Balancing version published" />);

    await user.click(screen.getByRole('button', { name: 'Raise' }));
    await screen.findByText('Balancing version published');

    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByText('Balancing version published')).not.toBeInTheDocument();
  });

  it('runs an action and names it', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithProviders(
      <Harness action={{ label: 'View version', onClick }} title="Balancing version published" />,
    );

    await user.click(screen.getByRole('button', { name: 'Raise' }));
    await user.click(await screen.findByRole('button', { name: 'View version' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('stacks several without collapsing them', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness title="Saved" />);

    const raise = screen.getByRole('button', { name: 'Raise' });
    await user.click(raise);
    await user.click(raise);

    // Each gets its own id from the provider's counter, so React keeps them as
    // distinct rows rather than reconciling two onto one key.
    expect(await screen.findAllByText('Saved')).toHaveLength(2);
  });

  it('carries a tone on its glyph, never on the title', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Harness icon={<CircleCheck />} title="Balancing version published" tone="good" />,
    );

    await user.click(screen.getByRole('button', { name: 'Raise' }));
    const toast = await screen.findByRole('listitem');

    // Golden rule 9 matters most here: a toast is transient, so a colour the
    // operator only half-catches is the whole signal. The glyph carries it and
    // the title stays ink.
    expect(toast.querySelector('[aria-hidden="true"].text-good')).toBeInTheDocument();
    expect(screen.getByText('Balancing version published')).toHaveClass('text-ink');
  });

  it('names its close button from the provider', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness title="Saved" />);

    await user.click(screen.getByRole('button', { name: 'Raise' }));

    // `closeLabel` is a required provider prop, so the ✕ can never ship
    // unnamed — and it is externalized rather than baked in (§5.6).
    expect(await screen.findByRole('button', { name: 'Dismiss' })).toBeVisible();
  });
});

describe('useToast', () => {
  it('throws a named error outside the provider', () => {
    // The house pattern from theme-context.ts: a named error beats "cannot read
    // properties of null" surfacing three components deep.
    expect(() => {
      renderWithProviders(<Raise title="Saved" />);
    }).toThrow('useToast must be used inside <ToastProvider>.');
  });
});
