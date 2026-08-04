import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Check } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/primitives/Button';
import { renderWithProviders } from '../../../support/render';

/**
 * Button's keyboard and form contract (§10: "every primitive's keyboard
 * contract").
 *
 * Most of what follows guards against defaults rather than logic. An unset
 * `type` submits its form; a spinner that replaces the label deletes the
 * accessible name; a Slot wrapping an anchor gets HTML that anchors may not
 * carry. None of these are visible in a screenshot, and all of them ship.
 */
describe('<Button />', () => {
  it('activates on both Enter and Space', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithProviders(<Button onClick={onClick}>Publish</Button>);

    await user.tab();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    // A <div role="button"> would pass one of these and fail the other, which
    // is exactly the substitution this asserts against.
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  it('does not submit the form it is sitting in', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent) => {
      event.preventDefault();
    });
    renderWithProviders(
      <form onSubmit={onSubmit}>
        <Button>Cancel</Button>
      </form>,
    );

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    // Without the type="button" default this is a page reload in production
    // and a passing test everywhere else.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('still submits when the caller explicitly asks it to', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent) => {
      event.preventDefault();
    });
    renderWithProviders(
      <form onSubmit={onSubmit}>
        <Button type="submit">Save</Button>
      </form>,
    );

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  describe('loading', () => {
    it('keeps the visible label and marks itself busy', () => {
      renderWithProviders(
        <Button loading busyLabel="Publishing the balancing version">
          Publish
        </Button>,
      );

      // §5.6 forbids a fixed-height text container, and swapping the label for
      // a spinner is the same defect on the horizontal axis — the button
      // resizes mid-action and momentarily has no accessible name.
      const button = screen.getByRole('button', { name: 'Publish' });

      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toBeDisabled();
    });

    it('announces the busy label without joining the accessible name', () => {
      renderWithProviders(
        <Button loading busyLabel="Publishing the balancing version">
          Publish
        </Button>,
      );

      // The status text is a SIBLING of the button. Inside it, the name would
      // become "Publish Publishing the balancing version" — which is why the
      // query above still finds an exactly-named button.
      expect(screen.getByRole('status')).toHaveTextContent('Publishing the balancing version');
      expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    });

    it('says nothing at all when idle', () => {
      renderWithProviders(<Button>Publish</Button>);

      // An always-mounted empty live region is a real source of phantom
      // announcements when several are on screen at once.
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('asChild', () => {
    it('renders the child element and keeps its semantics', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      renderWithProviders(
        <Button asChild>
          <a href="#audit" onClick={onClick}>
            Open audit
          </a>
        </Button>,
      );

      const link = screen.getByRole('link', { name: 'Open audit' });
      link.focus();
      await user.keyboard('{Enter}');

      // A link activates on Enter and NOT on Space. Preserving that is the
      // whole reason asChild exists rather than a `as="a"` prop that would
      // paint a button and lie about it.
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(link).toHaveAttribute('href', '#audit');
    });

    it('keeps the leading icon alongside the slotted child', () => {
      renderWithProviders(
        <Button asChild icon={<Check />}>
          <a href="#audit">Open audit</a>
        </Button>,
      );

      const link = screen.getByRole('link', { name: 'Open audit' });

      // Slottable is what lets an icon sibling survive the merge. Without it
      // Radix throws on multiple children, or silently drops one.
      expect(link.querySelector('svg')).toBeInTheDocument();
    });

    it('marks a disabled slot with aria-disabled, never the disabled attribute', () => {
      renderWithProviders(
        <Button asChild disabled>
          <a href="#audit">Open audit</a>
        </Button>,
      );

      const link = screen.getByRole('link', { name: 'Open audit' });

      // `disabled` is not a valid attribute on an anchor; emitting it produces
      // markup that validates as broken and disables nothing.
      expect(link).toHaveAttribute('aria-disabled', 'true');
      expect(link).not.toHaveAttribute('disabled');
    });
  });

  it('hides the icon from assistive tech', () => {
    renderWithProviders(<Button icon={<Check />}>Approve</Button>);

    // The label already carries the meaning; an announced icon is a duplicate.
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  });

  it('appends the caller className without dropping its own', () => {
    renderWithProviders(<Button className="w-full">Approve</Button>);

    // Pins the additive contract from lib/cn.ts at the component boundary:
    // the caller's class arrives AND the variant survives.
    const button = screen.getByRole('button', { name: 'Approve' });

    expect(button).toHaveClass('w-full');
    expect(button).toHaveClass('rounded-md');
  });
});
