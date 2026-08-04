import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Radio, RadioGroup } from '@/components/primitives/Radio';
import { renderWithProviders } from '../../../support/render';

/**
 * Presses ArrowDown, yields, then releases.
 *
 * Radix moves roving focus inside `setTimeout` (react-roving-focus, the
 * `focusFirst` call), while selection-follows-focus is gated on an
 * "is an arrow key currently down" ref that keyup clears. A real key press is
 * held for tens of milliseconds, so the macrotask lands first and the radio is
 * selected. `user.keyboard('{ArrowDown}')` fires keydown and keyup
 * back-to-back, clearing the flag before focus ever moves — the radio would
 * appear to rove without selecting, which is a jsdom timing artifact and not
 * how the component behaves in a browser.
 *
 * Holding the key across an await reproduces the real sequence.
 */
async function pressArrowDown(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.keyboard('{ArrowDown>}');
  await user.keyboard('{/ArrowDown}');
}

function Tiers({ onValueChange }: { onValueChange?: (next: string) => void }) {
  return (
    // Conditionally spread, not `{...{ onValueChange }}`: under
    // exactOptionalPropertyTypes an explicit `undefined` does not satisfy an
    // optional prop. Test code gets no discount from the strictness.
    <RadioGroup
      defaultValue="known"
      label="Progression tier"
      {...(onValueChange !== undefined && { onValueChange })}
    >
      <Radio label="New" value="new" />
      <Radio label="Known" value="known" />
      <Radio label="Popular" value="popular" />
    </RadioGroup>
  );
}

describe('<RadioGroup />', () => {
  it('is one tab stop, not one per option', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <Tiers />
        <button type="button">After</button>
      </>,
    );

    await user.tab();
    await user.tab();

    // Roving tabindex. Without it a ten-tier group costs ten tabs to walk past,
    // which is the difference between a usable filter bar and an unusable one.
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
  });

  it('moves and selects with the arrow keys', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(<Tiers onValueChange={onValueChange} />);

    await user.tab();
    await pressArrowDown(user);

    // In a radio group, moving IS selecting — there is no separate commit.
    expect(onValueChange).toHaveBeenCalledWith('popular');
    expect(screen.getByRole('radio', { name: 'Popular' })).toBeChecked();
  });

  it('wraps from the last option back to the first', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Tiers />);

    await user.tab();
    await pressArrowDown(user);
    await pressArrowDown(user);

    expect(screen.getByRole('radio', { name: 'New' })).toBeChecked();
  });

  it('names the group so a screen reader announces what is being chosen', () => {
    renderWithProviders(<Tiers />);

    // Without a group name the options announce as bare labels with no idea
    // what question they answer.
    expect(screen.getByRole('radiogroup', { name: 'Progression tier' })).toBeVisible();
  });
});
