import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Info } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { IconButton } from '@/components/primitives/IconButton';
import { Tooltip, TooltipProvider } from '@/components/primitives/Tooltip';
import { renderWithProviders } from '../../../support/render';

/**
 * The one thing a tooltip must never be: a control's only label.
 *
 * It is unreachable by touch, invisible to a keyboard user who never hovers,
 * and Radix wires it through `aria-describedby` rather than `aria-labelledby`.
 * A control named only by its tooltip announces as "button". These tests pin
 * that boundary so nobody "simplifies" IconButton's required `label` away in
 * favour of a tooltip.
 */
describe('<Tooltip />', () => {
  it('describes its trigger without renaming it', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <TooltipProvider>
        <Tooltip
          content="Food cost as a percentage of revenue."
          trigger={<IconButton icon={<Info />} label="About food cost" />}
        />
      </TooltipProvider>,
    );

    await user.hover(screen.getByRole('button', { name: 'About food cost' }));

    // Awaited: the provider holds a 300ms hover delay, so asserting straight
    // after the hover would read a description that has not been wired yet.
    await screen.findByRole('tooltip');

    // The NAME still comes from IconButton's own label; the tooltip only adds a
    // description. If these ever swap, the button loses its name on touch.
    expect(screen.getByRole('button', { name: 'About food cost' })).toHaveAccessibleDescription(
      'Food cost as a percentage of revenue.',
    );
  });

  it('opens on keyboard focus, not only on hover', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <TooltipProvider>
        <Tooltip
          content="Food cost as a percentage of revenue."
          trigger={<IconButton icon={<Info />} label="About food cost" />}
        />
      </TooltipProvider>,
    );

    await user.tab();

    // A tooltip that only responds to a pointer is invisible to half its
    // audience — WCAG 2.2 SC 1.4.13 exists for exactly this.
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Food cost as a percentage of revenue.',
    );
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <TooltipProvider>
        <Tooltip
          content="Food cost as a percentage of revenue."
          trigger={<IconButton icon={<Info />} label="About food cost" />}
        />
      </TooltipProvider>,
    );

    await user.tab();
    await screen.findByRole('tooltip');

    await user.keyboard('{Escape}');

    // SC 1.4.13 again: dismissible without moving the pointer or focus.
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
