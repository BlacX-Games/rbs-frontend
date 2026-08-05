import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Select } from '@/components/primitives/Select';
import { renderWithProviders } from '../../../support/render';

/**
 * The only overlay in stage 2a, and therefore the first primitive to owe §5.6's
 * overlay clause: "Esc closes every overlay, focus returns to the trigger".
 *
 * Radix supplies that behaviour; these tests assert we have not styled or
 * portalled our way out of it. Stage 2b's Combobox, MultiSelect, and
 * CommandPalette inherit this same trigger-and-content shape, so the contract
 * proven here is the one they will be held to.
 */

const ITEMS = [
  { value: 'budget_mid', label: 'Budget–Mid' },
  { value: 'mid', label: 'Mid' },
  { value: 'premium', label: 'Premium' },
] as const;

const PROPS = {
  label: 'Price bracket',
  placeholder: 'Choose a bracket',
  items: ITEMS,
} as const;

describe('<Select />', () => {
  it('announces itself by its label, and shows the placeholder until chosen', () => {
    renderWithProviders(<Select {...PROPS} />);

    const trigger = screen.getByRole('combobox', { name: 'Price bracket' });

    expect(trigger).toBeVisible();
    expect(trigger).toHaveTextContent('Choose a bracket');
  });

  it('opens from the keyboard and reports the chosen value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(<Select {...PROPS} onValueChange={onValueChange} />);

    await user.tab();
    await user.keyboard('{Enter}');

    await user.click(await screen.findByRole('option', { name: 'Premium' }));

    // The wire value, not the display label — the enum member is what crosses
    // the network, and conflating the two is how a display string ends up in a
    // database column.
    expect(onValueChange).toHaveBeenCalledWith('premium');
  });

  it('closes on Escape and hands focus back to the trigger', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Select {...PROPS} />);

    const trigger = screen.getByRole('combobox', { name: 'Price bracket' });
    await user.click(trigger);
    await screen.findByRole('option', { name: 'Mid' });

    await user.keyboard('{Escape}');

    // §5.6, verbatim. Focus stranded on a removed element drops the operator at
    // the top of the document — in a dense filter bar that is a lost place in
    // the form and a lost train of thought.
    expect(screen.queryByRole('option', { name: 'Mid' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('shows the label of the current value, not its wire form', () => {
    renderWithProviders(<Select {...PROPS} value="budget_mid" />);

    // Prisma is canonical for the wire value (`budget_mid`), and the operator
    // reads `Budget–Mid`. This is the seam where that mapping has to hold.
    expect(screen.getByRole('combobox', { name: 'Price bracket' })).toHaveTextContent('Budget–Mid');
  });

  it('carries the error semantics through from the shell', () => {
    renderWithProviders(<Select {...PROPS} error="Pick a bracket before saving." />);

    const trigger = screen.getByRole('combobox', { name: 'Price bracket' });

    expect(trigger).toBeInvalid();
    expect(trigger).toHaveAccessibleDescription('Pick a bracket before saving.');
  });
});
