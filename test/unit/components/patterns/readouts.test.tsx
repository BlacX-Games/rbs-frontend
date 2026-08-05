import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { DecisionFlag } from '@/components/patterns/DecisionFlag';
import { HealthMeter } from '@/components/patterns/HealthMeter';
import { ScoreDial } from '@/components/patterns/ScoreDial';
import { StatTile } from '@/components/patterns/StatTile';
import { SCORE_TIERS, tierOf } from '@/components/patterns/internal/scale';
import { EmptyState, ErrorState, ForbiddenState } from '@/components/patterns/states';
import { Button } from '@/components/primitives/Button';
import { TooltipProvider } from '@/components/primitives/Tooltip';
import { renderWithProviders } from '../../../support/render';

/**
 * The readout patterns.
 *
 * Most of these assertions are about the rules §5.2 and §5.6 make that a
 * screenshot cannot show: which channel carries a polarity, which token may
 * touch text, and whether a figure is a string or a number.
 */

describe('<StatTile />', () => {
  it('takes its value as a pre-formatted string', () => {
    renderWithProviders(<StatTile label="Net profit" value="$860.00" />);

    // Golden rule 10. A `number` prop would force every caller holding a
    // Decimal(12,2) to parse it just to display it — the exact IEEE-754
    // round-trip that loses the precision the Unity harness asserts on.
    expect(screen.getByText('$860.00')).toBeVisible();
  });

  it('uses the display face with proportional figures', () => {
    renderWithProviders(<StatTile label="Net profit" value="1,840.00" />);

    // §5.3's deliberate divergence from the usual advice: Fraunces IS the
    // brand here. `proportional-nums` undoes app.css's global tabular default,
    // because equal-width digits make a standalone 38px number look loose.
    const figure = screen.getByText('1,840.00');

    expect(figure).toHaveClass('font-display');
    expect(figure).toHaveClass('proportional-nums');
  });

  describe('the delta', () => {
    const CASES = [
      { direction: 'up', upIsGood: true, ink: 'text-good', why: 'rising revenue is good' },
      { direction: 'up', upIsGood: false, ink: 'text-bad', why: 'rising food cost is bad' },
      { direction: 'down', upIsGood: true, ink: 'text-bad', why: 'falling revenue is bad' },
      { direction: 'down', upIsGood: false, ink: 'text-good', why: 'falling food cost is good' },
    ] as const;

    it.each(CASES)('$why', ({ direction, upIsGood, ink }) => {
      renderWithProviders(
        <StatTile
          delta={{ value: '+12.4%', direction, label: 'vs previous 7 days' }}
          label="Measure"
          upIsGood={upIsGood}
          value="100"
        />,
      );

      // Polarity is direction × whether up is good, never direction alone.
      expect(screen.getByText('+12.4%')).toHaveClass(ink);
    });

    it('keeps a flat delta in ordinary ink, never the polarity midpoint', () => {
      renderWithProviders(
        <StatTile
          delta={{ value: '0.0%', direction: 'flat', label: 'vs previous 7 days' }}
          label="Measure"
          value="100"
        />,
      );

      // --polarity-neutral measures 3.40:1 dark / 3.64:1 light. It is a MARK
      // colour, and a body-size delta wearing it would fail WCAG in both themes.
      const delta = screen.getByText('0.0%');

      expect(delta).toHaveClass('text-ink-secondary');
      expect(delta).not.toHaveClass('text-neutral');
    });

    it('pairs every delta with a glyph', () => {
      const { container } = renderWithProviders(
        <StatTile
          delta={{ value: '+12.4%', direction: 'up', label: 'vs previous 7 days' }}
          label="Revenue"
          value="1,840"
        />,
      );

      // Golden rule 9 — a delta shown in red alone is unreadable to exactly the
      // operators the rule exists for.
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });

  it('names its sparkline rather than leaving a shape unlabelled', () => {
    renderWithProviders(
      <StatTile
        label="Covers"
        trend={{
          points: [
            { x: 'Mon', y: 1 },
            { x: 'Tue', y: 3 },
          ],
          summary: 'up 200% over 2 services',
        }}
        value="42"
      />,
    );

    expect(screen.getByRole('img', { name: /Covers: up 200%/ })).toBeVisible();
  });
});

describe('<HealthMeter />', () => {
  it('exposes itself as a meter with its bounds', () => {
    renderWithProviders(
      <HealthMeter
        band="good"
        bandLabel="under target"
        label="Food cost"
        value={26.1}
        valueLabel="26.1%"
      />,
    );

    const meter = screen.getByRole('meter', { name: 'Food cost' });

    expect(meter).toHaveAttribute('aria-valuenow', '26.1');
    expect(meter).toHaveAttribute('aria-valuetext', '26.1% — under target');
  });

  it('states the band in words as well as in colour', () => {
    renderWithProviders(
      <HealthMeter
        band="neutral"
        bandLabel="at target"
        label="Food cost"
        value={36}
        valueLabel="36.0%"
      />,
    );

    // The middle band is the one that most needs spelling out: it is a grey
    // fill and a dash, which is the closest this system gets to colour-alone.
    expect(screen.getByText('at target')).toBeVisible();
  });

  it('never puts the polarity midpoint on text', () => {
    renderWithProviders(
      <HealthMeter
        band="neutral"
        bandLabel="at target"
        label="Food cost"
        value={36}
        valueLabel="36.0%"
      />,
    );

    // bg-neutral on the fill is fine — a mark at the 3:1 gate. text-neutral
    // anywhere is not.
    expect(screen.getByText('36.0%')).not.toHaveClass('text-neutral');
    expect(screen.getByText('at target')).not.toHaveClass('text-neutral');
  });

  it('draws the target on the same track as the value', () => {
    const { container } = renderWithProviders(
      <HealthMeter
        band="good"
        bandLabel="under target"
        label="Food cost"
        target={32}
        targetLabel="target 32%"
        value={26.1}
        valueLabel="26.1%"
      />,
    );

    // "Where should this be" has to land in the same glance as "where is it";
    // a separate marker row breaks that.
    expect(container.querySelector('.bg-ink')).toBeInTheDocument();
    expect(screen.getByText('target 32%')).toBeVisible();
  });
});

describe('<ScoreDial />', () => {
  const CASES = [
    { value: 12, tier: 'New', why: 'the bottom band' },
    { value: 45, tier: 'Known', why: 'the second band' },
    { value: 72, tier: 'Popular', why: 'the GDD’s 61–85 band' },
    { value: 91, tier: 'Beloved', why: 'the top band' },
  ] as const;

  it.each(CASES)('$why → $tier', ({ value, tier }) => {
    renderWithProviders(<ScoreDial label="Reputation" value={value} />);

    expect(screen.getByText(tier)).toBeVisible();
    expect(screen.getByRole('meter', { name: 'Reputation' })).toHaveAttribute(
      'aria-valuetext',
      `${String(value)} — ${tier}`,
    );
  });

  it('renders the tier name in ordinary ink, because tier tokens are fill-only', () => {
    renderWithProviders(<ScoreDial label="Reputation" value={12} />);

    // --tier-new measures 2.20:1 dark / 2.19:1 light. Setting the label in its
    // own tier colour would be unreadable at exactly the step a new restaurant
    // sits on.
    expect(screen.getByText('New')).toHaveClass('text-ink');
  });

  it('clamps out-of-range scores rather than overdrawing the arc', () => {
    renderWithProviders(<ScoreDial label="Reputation" value={140} />);

    expect(screen.getByRole('meter', { name: 'Reputation' })).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
  });

  it('builds the four canon tiers, not five', () => {
    // balancing.json is the machine-readable authority and Unity's
    // ProgressionTierResolver agrees; Milestone 3's "ELITE" is the outlier.
    expect(SCORE_TIERS.map((tier) => tier.label)).toEqual(['New', 'Known', 'Popular', 'Beloved']);
    expect(tierOf(61).label).toBe('Popular');
    expect(tierOf(60).label).toBe('Known');
  });
});

describe('<DecisionFlag />', () => {
  it('names what is unsettled, not just that something is', () => {
    renderWithProviders(
      <TooltipProvider>
        <DecisionFlag
          detail="The §6.2 palette is still unsigned — appendix E item #20."
          label="Brand palette"
        />
      </TooltipProvider>,
    );

    // Golden rule 5: a flagged value renders with a visible marker and is never
    // presented as settled. A chip reading only "Needs decision" would leave a
    // screen-reader user with no idea which value it referred to.
    expect(screen.getByText('Needs decision')).toBeVisible();
    expect(screen.getByText(/Brand palette/)).toBeInTheDocument();
  });

  it('is keyboard-reachable, so its detail is not pointer-only', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <TooltipProvider>
        <DecisionFlag detail="Still unsigned." label="Brand palette" />
      </TooltipProvider>,
    );

    await user.tab();

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Still unsigned.');
  });

  it('links the appendix entry when one is given', () => {
    renderWithProviders(
      <TooltipProvider>
        <DecisionFlag detail="Still unsigned." href="#appendix-e" label="Brand palette" />
      </TooltipProvider>,
    );

    expect(screen.getByRole('link')).toHaveAttribute('href', '#appendix-e');
  });
});

describe('the three states', () => {
  it('each names the next action', () => {
    renderWithProviders(
      <EmptyState
        action={<Button>Clear filters</Button>}
        description="No session matches this filter."
        title="No sessions"
      />,
    );

    // §5.6 calls these components rather than afterthoughts, and the useful
    // half is what to do about it — "no results" alone tells an operator what
    // they already knew.
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeVisible();
  });

  it('announces an error, because it replaces awaited content', () => {
    renderWithProviders(
      <ErrorState description="The request timed out." title="Could not load sessions" />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Could not load sessions');
  });

  it('renders forbidden rather than hiding the route', () => {
    renderWithProviders(
      <ForbiddenState
        description="Balancing publish is owner and admin only."
        title="Not available to your role"
      />,
    );

    // §7.4: the UI never hides a route an operator can reach by URL. Hiding it
    // leaves someone on a blank page unsure whether it is broken or forbidden.
    expect(screen.getByRole('status')).toHaveTextContent('Not available to your role');
  });

  it('fixes no height, so a translated title cannot overflow', () => {
    const { container } = renderWithProviders(
      <EmptyState description="No session matches this filter." title="No sessions" />,
    );

    expect(container.firstElementChild?.className).not.toMatch(/\bh-\d/);
  });
});
