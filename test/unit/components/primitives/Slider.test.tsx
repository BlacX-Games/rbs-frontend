import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Slider } from '@/components/primitives/Slider';
import { renderWithProviders } from '../../../support/render';

describe('<Slider />', () => {
  it('exposes a named slider with its bounds', () => {
    renderWithProviders(<Slider defaultValue={[42]} label="Covers" max={100} min={0} />);

    const slider = screen.getByRole('slider', { name: 'Covers' });

    expect(slider).toHaveAttribute('aria-valuenow', '42');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
  });

  describe('keyboard', () => {
    const CASES = [
      { keys: '{ArrowRight}', expected: '43', why: 'ArrowRight steps up' },
      { keys: '{ArrowLeft}', expected: '41', why: 'ArrowLeft steps down' },
      { keys: '{Home}', expected: '0', why: 'Home jumps to the minimum' },
      { keys: '{End}', expected: '100', why: 'End jumps to the maximum' },
    ] as const;

    it.each(CASES)('$why', async ({ keys, expected }) => {
      const user = userEvent.setup();
      renderWithProviders(<Slider defaultValue={[42]} label="Covers" max={100} min={0} />);

      await user.tab();
      await user.keyboard(keys);

      expect(screen.getByRole('slider', { name: 'Covers' })).toHaveAttribute(
        'aria-valuenow',
        expected,
      );
    });
  });

  it('reads out formatValue rather than the bare number', () => {
    renderWithProviders(
      <Slider
        defaultValue={[42]}
        formatValue={(value) => `${String(value)} covers served`}
        label="Covers"
      />,
    );

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuetext', '42 covers served');
  });

  it('names each thumb of a range so they are distinguishable', () => {
    renderWithProviders(<Slider defaultValue={[20, 80]} label="Reputation band" />);

    // Two thumbs sharing one name are indistinguishable to a screen reader —
    // the operator cannot tell which end of the band they are moving.
    expect(screen.getByRole('slider', { name: 'Reputation band 1' })).toBeVisible();
    expect(screen.getByRole('slider', { name: 'Reputation band 2' })).toBeVisible();
  });

  it('reports changes to a controlled parent', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    renderWithProviders(
      <Slider label="Covers" max={100} min={0} onValueChange={onValueChange} value={[42]} />,
    );

    await user.tab();
    await user.keyboard('{ArrowRight}');

    expect(onValueChange).toHaveBeenCalledWith([43]);
  });
});
