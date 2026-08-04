import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from '@/components/primitives/Checkbox';
import { renderWithProviders } from '../../../support/render';

describe('<Checkbox />', () => {
  it('toggles on Space, and only on Space', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    renderWithProviders(<Checkbox label="Featured" onCheckedChange={onCheckedChange} />);

    await user.tab();
    await user.keyboard(' ');
    await user.keyboard('{Enter}');

    // Enter must NOT toggle a checkbox — inside a form it submits instead, and
    // a checkbox that swallows Enter breaks that.
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('toggles when its label is clicked', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    renderWithProviders(<Checkbox label="Featured" onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByText('Featured'));

    // htmlFor pointing at the Radix Root, which renders a <button> — a
    // labelable element, so the click forwards. Losing the id association is
    // silent: the checkbox still works, the label just stops being a target.
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('reports an indeterminate state as mixed', () => {
    renderWithProviders(<Checkbox checked="indeterminate" label="Featured" />);

    // "mixed", not "true". A bulk-selection header that announces itself as
    // checked claims every row is selected when only some are.
    expect(screen.getByRole('checkbox', { name: 'Featured' })).toHaveAttribute(
      'aria-checked',
      'mixed',
    );
  });

  it('describes itself with its description', () => {
    renderWithProviders(
      <Checkbox description="Shown first in the moderation queue." label="Featured" />,
    );

    expect(screen.getByRole('checkbox', { name: 'Featured' })).toHaveAccessibleDescription(
      'Shown first in the moderation queue.',
    );
  });

  it('cannot be toggled when disabled', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    renderWithProviders(<Checkbox disabled label="Featured" onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByRole('checkbox', { name: 'Featured' }));

    expect(onCheckedChange).not.toHaveBeenCalled();
  });
});
