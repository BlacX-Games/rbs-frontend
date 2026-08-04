import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Combobox } from '@/components/primitives/Combobox';
import { MultiSelect } from '@/components/primitives/MultiSelect';
import { renderWithProviders } from '../../../support/render';

/**
 * The APG "editable combobox with list autocomplete".
 *
 * The assertion that matters most is that FOCUS NEVER LEAVES THE INPUT. It is
 * the whole reason the pattern uses `aria-activedescendant` instead of roving
 * tabindex, and it is invisible in a screenshot — a combobox that moves focus
 * into the list looks identical and stops accepting typing.
 */

const CUISINES = [
  { value: 'bbq', label: 'Barbecue', keywords: 'smoke brisket' },
  { value: 'french', label: 'Crème Brûlée Bistro' },
  { value: 'italian', label: 'Italian' },
  { value: 'thai', label: 'Thai' },
] as const;

const PROPS = {
  label: 'Cuisine',
  placeholder: 'Search cuisines',
  emptyLabel: 'No cuisine matches',
  items: CUISINES,
} as const;

describe('<Combobox />', () => {
  it('exposes the ARIA combobox wiring', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Combobox {...PROPS} />);

    const input = screen.getByRole('combobox', { name: 'Cuisine' });

    expect(input).toHaveAttribute('aria-expanded', 'false');

    await user.click(input);

    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(await screen.findByRole('listbox', { name: 'Cuisine' })).toBeVisible();
  });

  it('keeps focus in the input while arrowing through options', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Combobox {...PROPS} />);

    const input = screen.getByRole('combobox', { name: 'Cuisine' });
    await user.click(input);
    await user.keyboard('{ArrowDown}');

    // Focus stays put; `aria-activedescendant` is what moves. Anything else and
    // the caret leaves the field the operator is still typing in.
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('aria-activedescendant');
  });

  it('filters as you type, ignoring case and diacritics', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Combobox {...PROPS} />);

    await user.click(screen.getByRole('combobox', { name: 'Cuisine' }));
    await user.keyboard('creme');

    // "Crème Brûlée" found by typing `creme` on a UK keyboard. The catalogue is
    // full of accented dish names, so this is a real lookup, not a nicety.
    expect(await screen.findByRole('option', { name: /Crème Brûlée/ })).toBeVisible();
    expect(screen.queryByRole('option', { name: 'Italian' })).not.toBeInTheDocument();
  });

  it('searches keywords that are never displayed', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Combobox {...PROPS} />);

    await user.click(screen.getByRole('combobox', { name: 'Cuisine' }));
    await user.keyboard('brisket');

    expect(await screen.findByRole('option', { name: 'Barbecue' })).toBeVisible();
  });

  it('selects the active option on Enter and shows its label', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(<Combobox {...PROPS} onValueChange={onValueChange} />);

    const input = screen.getByRole('combobox', { name: 'Cuisine' });
    await user.click(input);
    await user.keyboard('thai{Enter}');

    // The wire value goes to the handler; the operator sees the label.
    expect(onValueChange).toHaveBeenCalledWith('thai');
    expect(input).toHaveValue('Thai');
  });

  it('wraps at both ends of the list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Combobox {...PROPS} />);

    const input = screen.getByRole('combobox', { name: 'Cuisine' });
    await user.click(input);
    await user.keyboard('{ArrowUp}');

    const options = await screen.findAllByRole('option');
    const last = options.at(-1);

    // ArrowUp from the top lands on the bottom — the APG listbox behaviour, and
    // the fastest route to the end of a long catalogue.
    expect(input).toHaveAttribute('aria-activedescendant', last?.id);
  });

  it('shows the empty label rather than an empty box', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Combobox {...PROPS} />);

    await user.click(screen.getByRole('combobox', { name: 'Cuisine' }));
    await user.keyboard('zzzz');

    expect(await screen.findByText('No cuisine matches')).toBeVisible();
    // The empty state is role="presentation", so it is never counted or
    // announced as an option — "1 of 1" pointing at nothing is worse than
    // silence.
    expect(screen.queryAllByRole('option')).toHaveLength(0);
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Combobox {...PROPS} />);

    const input = screen.getByRole('combobox', { name: 'Cuisine' });
    await user.click(input);
    await screen.findByRole('listbox');

    await user.keyboard('{Escape}');

    expect(input).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('<MultiSelect />', () => {
  const MULTI = {
    label: 'Cuisine tags',
    placeholder: 'Add a cuisine',
    emptyLabel: 'No cuisine matches',
    items: CUISINES,
    removeLabel: (item: string) => `Remove ${item}`,
  };

  it('keeps the list open so several can be picked in one go', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(<MultiSelect {...MULTI} onValueChange={onValueChange} />);

    const input = screen.getByRole('combobox', { name: 'Cuisine tags' });
    await user.click(input);

    // Enter alone, no ArrowDown: opening already highlights the FIRST option,
    // which is what makes type-and-Enter land on the top match rather than
    // needing an arrow press first.
    await user.keyboard('{Enter}');

    // Unlike Combobox: tagging a dish with four cuisines should be one
    // interaction, not four round trips through the field.
    expect(await screen.findByRole('listbox')).toBeVisible();
    expect(onValueChange).toHaveBeenCalledWith(['bbq']);
  });

  it('moves off the pre-highlighted first option on ArrowDown', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(<MultiSelect {...MULTI} onValueChange={onValueChange} />);

    await user.click(screen.getByRole('combobox', { name: 'Cuisine tags' }));
    await user.keyboard('{ArrowDown}{Enter}');

    // The corollary of the above: since option one is already active, one
    // ArrowDown reaches option two. Asserted so the two behaviours stay
    // consistent with each other rather than drifting apart.
    expect(onValueChange).toHaveBeenCalledWith(['french']);
  });

  it('renders each selection as a removable tag with a distinct name', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MultiSelect {...MULTI} defaultValue={['bbq', 'thai']} />);

    // "Remove Barbecue", not "Remove". Eight identically-named buttons are
    // indistinguishable in a screen reader's list.
    expect(screen.getByRole('button', { name: 'Remove Barbecue' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Remove Thai' }));

    expect(screen.queryByRole('button', { name: 'Remove Thai' })).not.toBeInTheDocument();
  });

  it('removes the last tag on Backspace in an empty field', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(
      <MultiSelect {...MULTI} defaultValue={['bbq', 'thai']} onValueChange={onValueChange} />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Cuisine tags' }));
    await user.keyboard('{Backspace}');

    expect(onValueChange).toHaveBeenCalledWith(['bbq']);
  });

  it('does not eat a Backspace mid-word', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(
      <MultiSelect {...MULTI} defaultValue={['bbq']} onValueChange={onValueChange} />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Cuisine tags' }));
    await user.keyboard('th{Backspace}');

    // Guarded on an empty query, or correcting a typo silently deletes a tag.
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('toggles a selected option back off', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(
      <MultiSelect {...MULTI} defaultValue={['bbq']} onValueChange={onValueChange} />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Cuisine tags' }));
    await user.click(await screen.findByRole('option', { name: 'Barbecue' }));

    // Selected options stay in the list with aria-selected, so they can be
    // unpicked from the keyboard rather than only via their tag.
    expect(onValueChange).toHaveBeenCalledWith([]);
  });
});
