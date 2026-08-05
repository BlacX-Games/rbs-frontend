import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Ellipsis } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/primitives/Button';
import { Dialog } from '@/components/primitives/Dialog';
import { Drawer } from '@/components/primitives/Drawer';
import { DropdownMenu } from '@/components/primitives/DropdownMenu';
import { IconButton } from '@/components/primitives/IconButton';
import { Popover } from '@/components/primitives/Popover';
import { renderWithProviders } from '../../../support/render';

/**
 * §5.6's overlay clause, verbatim: "Esc closes every overlay, focus returns to
 * the trigger."
 *
 * Asserted once across all four portalled overlays rather than four times over.
 * Radix provides the behaviour; what this defends is that we have not styled,
 * portalled, or `asChild`-ed our way out of it — which is easy to do, and
 * silent when it happens. Focus stranded on a removed node drops the operator
 * at the top of the document, mid-task.
 */

const TRIGGER = 'Open it';
const INSIDE = 'Inside the overlay';

const OVERLAYS = [
  {
    name: 'Dialog',
    render: () => (
      <Dialog closeLabel="Close" title="Delete restaurant" trigger={<Button>{TRIGGER}</Button>}>
        <p>{INSIDE}</p>
      </Dialog>
    ),
    modal: true,
  },
  {
    name: 'Drawer',
    render: () => (
      <Drawer closeLabel="Close" title="Session detail" trigger={<Button>{TRIGGER}</Button>}>
        <p>{INSIDE}</p>
      </Drawer>
    ),
    modal: true,
  },
  {
    name: 'Popover',
    render: () => (
      <Popover label="Filters" trigger={<Button>{TRIGGER}</Button>}>
        <p>{INSIDE}</p>
      </Popover>
    ),
    modal: false,
  },
  {
    name: 'DropdownMenu',
    render: () => (
      <DropdownMenu
        items={[{ id: 'one', label: INSIDE, onSelect: () => undefined }]}
        label="Row actions"
        trigger={<IconButton icon={<Ellipsis />} label={TRIGGER} />}
      />
    ),
    modal: false,
  },
] as const;

describe('the overlay contract', () => {
  describe.each(OVERLAYS)('$name', ({ render }) => {
    it('opens from its trigger', async () => {
      const user = userEvent.setup();
      renderWithProviders(render());

      await user.click(screen.getByRole('button', { name: TRIGGER }));

      expect(await screen.findByText(INSIDE)).toBeVisible();
    });

    it('closes on Escape and returns focus to the trigger', async () => {
      const user = userEvent.setup();
      renderWithProviders(render());

      const trigger = screen.getByRole('button', { name: TRIGGER });
      await user.click(trigger);
      await screen.findByText(INSIDE);

      await user.keyboard('{Escape}');

      expect(screen.queryByText(INSIDE)).not.toBeInTheDocument();
      // The half of the clause everyone forgets. Closing is visible in a
      // screenshot; where focus landed is not.
      expect(trigger).toHaveFocus();
    });
  });
});

describe('<Dialog />', () => {
  it('names itself, which Radix would otherwise only warn about', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Dialog
        closeLabel="Close"
        description="This cannot be undone."
        title="Delete restaurant"
        trigger={<Button>{TRIGGER}</Button>}
      >
        <p>{INSIDE}</p>
      </Dialog>,
    );

    await user.click(screen.getByRole('button', { name: TRIGGER }));

    // `title` is a required prop precisely so this cannot regress: an unnamed
    // dialog announces as "dialog" and nothing else.
    const dialog = await screen.findByRole('dialog', { name: 'Delete restaurant' });

    expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
  });

  it('traps focus while it is open', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <button type="button">Outside</button>
        <Dialog closeLabel="Close" title="Delete restaurant" trigger={<Button>{TRIGGER}</Button>}>
          <button type="button">Inside button</button>
        </Dialog>
      </>,
    );

    await user.click(screen.getByRole('button', { name: TRIGGER }));
    const dialog = await screen.findByRole('dialog');

    // Enough tabs to cycle past every control inside and wrap.
    await user.tab();
    await user.tab();
    await user.tab();

    // Focus stays inside, which is what a trap actually means. A modal that
    // leaks it lets an operator edit the page behind a confirmation they have
    // not answered.
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    // And the guarantee is stronger than focus alone: Radix aria-hides the rest
    // of the document, so "Outside" is not merely unfocusable, it is gone from
    // the accessibility tree. A screen-reader user cannot wander out either.
    expect(screen.queryByRole('button', { name: 'Outside' })).not.toBeInTheDocument();
  });

  it('closes from a footer DialogClose', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <Dialog closeLabel="Close" title="Delete restaurant" trigger={<Button>{TRIGGER}</Button>}>
        <p>{INSIDE}</p>
      </Dialog>,
    );

    await user.click(screen.getByRole('button', { name: TRIGGER }));
    await screen.findByText(INSIDE);

    await user.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByText(INSIDE)).not.toBeInTheDocument();
  });
});

describe('<DropdownMenu />', () => {
  it('runs the action it was given', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    renderWithProviders(
      <DropdownMenu
        items={[{ id: 'delete', label: 'Delete restaurant', onSelect, destructive: true }]}
        label="Row actions"
        trigger={<IconButton icon={<Ellipsis />} label={TRIGGER} />}
      />,
    );

    await user.click(screen.getByRole('button', { name: TRIGGER }));
    await user.click(await screen.findByRole('menuitem', { name: 'Delete restaurant' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('opens on ArrowDown and lands on the first item', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <DropdownMenu
        items={[
          { id: 'one', label: 'Export account', onSelect: () => undefined },
          { id: 'two', label: 'Delete account', onSelect: () => undefined },
        ]}
        label="Row actions"
        trigger={<IconButton icon={<Ellipsis />} label={TRIGGER} />}
      />,
    );

    screen.getByRole('button', { name: TRIGGER }).focus();
    await user.keyboard('{ArrowDown}');

    // The APG menu-button pattern: ArrowDown opens AND moves into the menu, so
    // a keyboard user does not need a second key to reach the first action.
    expect(await screen.findByRole('menuitem', { name: 'Export account' })).toHaveFocus();
  });
});
