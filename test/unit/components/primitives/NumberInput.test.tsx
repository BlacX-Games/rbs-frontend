import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NumberInput } from '@/components/primitives/NumberInput';
import { renderWithProviders } from '../../../support/render';

/**
 * The ARIA spinbutton contract, and the clamping rule that is easy to get
 * backwards.
 *
 * The headline case is "reaches 10 when the minimum is 5". Clamping on every
 * keystroke is the obvious implementation and it silently makes two-digit
 * entry impossible above a non-zero minimum — the "1" becomes "5" before the
 * "0" arrives. It is invisible in review and infuriating in use.
 */

const LABELS = {
  label: 'Food cost target',
  incrementLabel: 'Increase food cost target',
  decrementLabel: 'Decrease food cost target',
} as const;

describe('<NumberInput />', () => {
  it('exposes itself as a spinbutton with its bounds', () => {
    renderWithProviders(<NumberInput {...LABELS} defaultValue={32} max={100} min={0} />);

    const field = screen.getByRole('spinbutton', { name: 'Food cost target' });

    expect(field).toHaveAttribute('aria-valuenow', '32');
    expect(field).toHaveAttribute('aria-valuemin', '0');
    expect(field).toHaveAttribute('aria-valuemax', '100');
  });

  it('reads out formatValue rather than the bare number', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <NumberInput
        {...LABELS}
        defaultValue={32}
        formatValue={(value) => `${String(value)} percent`}
      />,
    );

    // aria-valuetext is what a screen reader prefers over aria-valuenow. "32"
    // and "32 percent" are very different instructions to act on.
    expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-valuetext', '32 percent');

    await user.click(screen.getByRole('button', { name: LABELS.incrementLabel }));

    expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-valuetext', '33 percent');
  });

  describe('keyboard', () => {
    const CASES = [
      { keys: '{ArrowUp}', expected: '33', why: 'ArrowUp steps up' },
      { keys: '{ArrowDown}', expected: '31', why: 'ArrowDown steps down' },
      { keys: '{PageUp}', expected: '42', why: 'PageUp steps by ten times' },
      { keys: '{PageDown}', expected: '22', why: 'PageDown steps down by ten times' },
      { keys: '{Home}', expected: '0', why: 'Home jumps to the minimum' },
      { keys: '{End}', expected: '100', why: 'End jumps to the maximum' },
    ] as const;

    it.each(CASES)('$why', async ({ keys, expected }) => {
      const user = userEvent.setup();
      renderWithProviders(<NumberInput {...LABELS} defaultValue={32} max={100} min={0} />);

      await user.click(screen.getByRole('spinbutton'));
      await user.keyboard(keys);

      expect(screen.getByRole('spinbutton')).toHaveValue(expected);
    });

    it('respects a custom step', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NumberInput {...LABELS} defaultValue={0.15} step={0.05} />);

      await user.click(screen.getByRole('spinbutton'));
      await user.keyboard('{ArrowUp}');

      // 0.15 + 0.05 in IEEE-754 is 0.2 exactly here, but this is precisely the
      // arithmetic golden rule 10 keeps money away from.
      expect(screen.getByRole('spinbutton')).toHaveValue('0.2');
    });
  });

  describe('clamping', () => {
    it('lets an operator type 10 when the minimum is 5', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NumberInput {...LABELS} defaultValue={5} max={100} min={5} />);

      const field = screen.getByRole('spinbutton');
      await user.clear(field);
      await user.type(field, '10');
      await user.tab();

      // The whole reason clamping waits for blur. Per-keystroke clamping turns
      // this into "50" — the "1" clamps to "5", then the "0" appends.
      expect(field).toHaveValue('10');
    });

    it('clamps to the bounds on blur', async () => {
      const user = userEvent.setup();
      const onValueChange = vi.fn();
      renderWithProviders(
        <NumberInput
          {...LABELS}
          defaultValue={50}
          max={100}
          min={0}
          onValueChange={onValueChange}
        />,
      );

      const field = screen.getByRole('spinbutton');
      await user.clear(field);
      await user.type(field, '250');
      await user.tab();

      expect(field).toHaveValue('100');
      expect(onValueChange).toHaveBeenLastCalledWith(100);
    });

    it('restores the last good value when left empty', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NumberInput {...LABELS} defaultValue={32} />);

      const field = screen.getByRole('spinbutton');
      await user.clear(field);
      await user.tab();

      // An empty numeric field is not zero — zero is a decision the operator
      // did not make. Blur restores rather than inventing a value.
      expect(field).toHaveValue('32');
    });

    it('never steps outside the bounds', async () => {
      const user = userEvent.setup();
      renderWithProviders(<NumberInput {...LABELS} defaultValue={100} max={100} min={0} />);

      await user.click(screen.getByRole('spinbutton'));
      await user.keyboard('{ArrowUp}');

      expect(screen.getByRole('spinbutton')).toHaveValue('100');
    });
  });

  it('refuses characters that are not part of a number', async () => {
    const user = userEvent.setup();
    renderWithProviders(<NumberInput {...LABELS} defaultValue={32} />);

    const field = screen.getByRole('spinbutton');
    await user.type(field, 'abc');

    // type="number" would accept "e" here and hand back an empty string on
    // read, which is the failure mode this whole component exists to avoid.
    expect(field).toHaveValue('32');
  });

  describe('steppers', () => {
    it('carries the required accessible names', () => {
      renderWithProviders(<NumberInput {...LABELS} defaultValue={32} />);

      // Required props, so this cannot regress silently — but it can regress by
      // the sr-only span being dropped, which the type system does not see.
      expect(screen.getByRole('button', { name: LABELS.incrementLabel })).toBeVisible();
      expect(screen.getByRole('button', { name: LABELS.decrementLabel })).toBeVisible();
    });

    it('disables itself at the bound it would cross', () => {
      renderWithProviders(<NumberInput {...LABELS} defaultValue={0} max={100} min={0} />);

      expect(screen.getByRole('button', { name: LABELS.decrementLabel })).toBeDisabled();
      expect(screen.getByRole('button', { name: LABELS.incrementLabel })).toBeEnabled();
    });
  });

  it('follows a controlled value without fighting the parent', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = renderWithProviders(
      <NumberInput {...LABELS} onValueChange={onValueChange} value={32} />,
    );

    await user.click(screen.getByRole('button', { name: LABELS.incrementLabel }));

    // A controlled component reports and waits; it does not move itself.
    expect(onValueChange).toHaveBeenCalledWith(33);
    expect(screen.getByRole('spinbutton')).toHaveValue('32');

    rerender(<NumberInput {...LABELS} onValueChange={onValueChange} value={33} />);

    expect(screen.getByRole('spinbutton')).toHaveValue('33');
  });
});
