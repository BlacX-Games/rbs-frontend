import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CommandPalette } from '@/components/primitives/CommandPalette';
import { renderWithProviders } from '../../../support/render';

/**
 * The ⌘K palette. Controlled by design — the shortcut is its trigger, and no
 * trigger element exists on screen for it to hang from.
 */

function palette(onSelect: () => void) {
  return [
    { id: 'players', label: 'Go to Players', group: 'Navigate', onSelect },
    { id: 'sessions', label: 'Go to Sessions', group: 'Navigate', onSelect },
    { id: 'publish', label: 'Publish balancing', group: 'Balancing', keywords: 'deploy', onSelect },
  ];
}

const PROPS = {
  label: 'Command palette',
  placeholder: 'Search commands',
  emptyLabel: 'No command matches',
};

describe('<CommandPalette />', () => {
  it('names the dialog even with no visible heading', () => {
    renderWithProviders(
      <CommandPalette
        {...PROPS}
        commands={palette(() => undefined)}
        onOpenChange={() => undefined}
        open
      />,
    );

    // The placeholder is the visible affordance, but a dialog still owes an
    // accessible name — supplied through a VisuallyHidden Title.
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
  });

  it('puts focus in the search field on open', () => {
    renderWithProviders(
      <CommandPalette
        {...PROPS}
        commands={palette(() => undefined)}
        onOpenChange={() => undefined}
        open
      />,
    );

    // Unlike Combobox, focus IS moved here — there is no field behind the
    // dialog for it to have come from, and typing immediately is the point.
    expect(screen.getByRole('combobox', { name: 'Command palette' })).toHaveFocus();
  });

  it('groups commands under headings', () => {
    renderWithProviders(
      <CommandPalette
        {...PROPS}
        commands={palette(() => undefined)}
        onOpenChange={() => undefined}
        open
      />,
    );

    expect(screen.getByText('Navigate')).toBeVisible();
    expect(screen.getByText('Balancing')).toBeVisible();
  });

  it('drops a heading when its every command is filtered out', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CommandPalette
        {...PROPS}
        commands={palette(() => undefined)}
        onOpenChange={() => undefined}
        open
      />,
    );

    await user.keyboard('publish');

    // Headings are derived from the filtered set, so an empty group vanishes
    // rather than leaving a heading with nothing under it.
    expect(screen.getByText('Balancing')).toBeVisible();
    expect(screen.queryByText('Navigate')).not.toBeInTheDocument();
  });

  it('finds a command by a keyword it never shows', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CommandPalette
        {...PROPS}
        commands={palette(() => undefined)}
        onOpenChange={() => undefined}
        open
      />,
    );

    await user.keyboard('deploy');

    expect(screen.getByRole('option', { name: 'Publish balancing' })).toBeVisible();
  });

  it('runs the highlighted command and closes', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const onOpenChange = vi.fn();
    renderWithProviders(
      <CommandPalette {...PROPS} commands={palette(onSelect)} onOpenChange={onOpenChange} open />,
    );

    await user.keyboard('sessions{Enter}');

    // Closes BEFORE running, so a command that navigates does not race the
    // dialog's own unmount.
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('shows the empty label rather than an empty box', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CommandPalette
        {...PROPS}
        commands={palette(() => undefined)}
        onOpenChange={() => undefined}
        open
      />,
    );

    await user.keyboard('zzzz');

    expect(screen.getByText('No command matches')).toBeVisible();
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderWithProviders(
      <CommandPalette
        {...PROPS}
        commands={palette(() => undefined)}
        onOpenChange={onOpenChange}
        open
      />,
    );

    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
