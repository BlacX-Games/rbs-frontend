import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from '@/components/primitives/Switch';
import { renderWithProviders } from '../../../support/render';

describe('<Switch />', () => {
  it('announces as a switch with its on/off state', () => {
    renderWithProviders(<Switch defaultChecked label="Poll for new sessions" />);

    // role="switch", not "checkbox": a screen reader says "on"/"off" rather
    // than "checked", which is the right vocabulary for a setting that takes
    // effect immediately rather than on submit.
    expect(screen.getByRole('switch', { name: 'Poll for new sessions' })).toBeChecked();
  });

  it('toggles on Space', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    renderWithProviders(<Switch label="Poll for new sessions" onCheckedChange={onCheckedChange} />);

    await user.tab();
    await user.keyboard(' ');

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('toggles from its label', async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    renderWithProviders(<Switch label="Poll for new sessions" onCheckedChange={onCheckedChange} />);

    await user.click(screen.getByText('Poll for new sessions'));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('keeps a state-conveying transform under reduced motion', () => {
    renderWithProviders(<Switch defaultChecked label="Poll for new sessions" />);

    const thumb = screen.getByRole('switch').querySelector('span > span');

    // §5.4 says reduced motion drops transforms, but this translate IS the
    // on/off indicator — dropping it leaves a switch with no readable state.
    // tokens.css collapses the DURATION globally, so the movement still
    // happens, in 1ms. Asserted so nobody adds motion-reduce:translate-x-0 and
    // silently deletes the affordance.
    expect(thumb).toHaveClass('group-data-[state=checked]:translate-x-20');
  });

  it('describes itself with its description', () => {
    renderWithProviders(
      <Switch description="Refreshes every 15 seconds." label="Poll for new sessions" />,
    );

    expect(
      screen.getByRole('switch', { name: 'Poll for new sessions' }),
    ).toHaveAccessibleDescription('Refreshes every 15 seconds.');
  });
});
