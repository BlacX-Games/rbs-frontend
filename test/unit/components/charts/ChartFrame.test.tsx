import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { BarChart } from '@/components/charts/BarChart';
import { ChartFrame } from '@/components/charts/ChartFrame';
import { LineChart } from '@/components/charts/LineChart';
import { SmallMultiples } from '@/components/charts/SmallMultiples';
import { Sparkline } from '@/components/charts/Sparkline';
import type { ChartSeries } from '@/components/charts/chart';
import { renderWithProviders } from '../../../support/render';

/**
 * The accessibility contract every chart owes.
 *
 * `width` is passed explicitly throughout: jsdom does no layout, so ParentSize
 * measures zero and would render nothing at all. That is a test-environment
 * fact, not a component one — the real measurement is exercised in Playwright.
 */

const COVERS: ChartSeries = {
  key: 'covers',
  label: 'Covers',
  slot: 1,
  points: [
    { x: 'Mon', y: 32 },
    { x: 'Tue', y: 41 },
    { x: 'Wed', y: 28 },
  ],
};

const REVENUE: ChartSeries = {
  key: 'revenue',
  label: 'Revenue',
  slot: 2,
  points: [
    { x: 'Mon', y: 1200 },
    { x: 'Tue', y: 1840 },
    { x: 'Wed', y: 990 },
  ],
};

const FRAME = {
  title: 'Covers by day',
  xLabel: 'Day',
  tableLabel: 'Show as table',
  chartLabel: 'Show as chart',
  width: 480,
} as const;

describe('<ChartFrame />', () => {
  it('is a figure named by its title', () => {
    renderWithProviders(
      <ChartFrame {...FRAME} series={[COVERS]}>
        {() => null}
      </ChartFrame>,
    );

    expect(screen.getByRole('figure', { name: 'Covers by day' })).toBeVisible();
  });

  describe('the table-view twin', () => {
    it('offers a toggle on every chart', () => {
      renderWithProviders(
        <ChartFrame {...FRAME} series={[COVERS]}>
          {() => null}
        </ChartFrame>,
      );

      // Mandatory, not optional. §5.2's relief rule PASSes --series-3 and
      // --series-5 at sub-3:1 on paper ONLY on condition a table view exists,
      // so a chart without this toggle makes the palette non-conformant.
      expect(screen.getByRole('button', { name: 'Show as table' })).toBeVisible();
    });

    it('reveals every value without a pointer', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ChartFrame {...FRAME} series={[COVERS, REVENUE]}>
          {() => null}
        </ChartFrame>,
      );

      await user.click(screen.getByRole('button', { name: 'Show as table' }));

      const table = screen.getByRole('table');

      // Tooltips enhance, they never gate — every value they show is reachable
      // here, with no hovering at all.
      expect(within(table).getByRole('columnheader', { name: /Covers/ })).toBeVisible();
      expect(within(table).getByRole('cell', { name: '1,840' })).toBeVisible();
      expect(within(table).getByRole('rowheader', { name: 'Tue' })).toBeVisible();
    });

    it('reports its pressed state so the toggle is not a mystery', async () => {
      const user = userEvent.setup();
      renderWithProviders(
        <ChartFrame {...FRAME} series={[COVERS]}>
          {() => null}
        </ChartFrame>,
      );

      const toggle = screen.getByRole('button', { name: 'Show as table' });
      expect(toggle).toHaveAttribute('aria-pressed', 'false');

      await user.click(toggle);

      expect(screen.getByRole('button', { name: 'Show as chart' })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });

    it('shows a dash where a series has no point, never a zero', async () => {
      const user = userEvent.setup();
      const sparse: ChartSeries = { ...REVENUE, points: [{ x: 'Mon', y: 1200 }] };
      renderWithProviders(
        <ChartFrame {...FRAME} series={[COVERS, sparse]}>
          {() => null}
        </ChartFrame>,
      );

      await user.click(screen.getByRole('button', { name: 'Show as table' }));

      // Missing and zero are different facts. Rendering 0 for "no session that
      // day" would put a number in the table that never happened.
      expect(screen.getAllByRole('cell', { name: '—' })).toHaveLength(2);
    });
  });

  describe('the legend', () => {
    it('appears for two or more series', () => {
      renderWithProviders(
        <ChartFrame {...FRAME} series={[COVERS, REVENUE]}>
          {() => null}
        </ChartFrame>,
      );

      // Identity must never rest on colour-matching alone — the same rule
      // golden rule 9 states for status.
      expect(screen.getByText('Covers')).toBeVisible();
      expect(screen.getByText('Revenue')).toBeVisible();
    });

    it('is absent for one', () => {
      renderWithProviders(
        <ChartFrame {...FRAME} series={[COVERS]}>
          {() => null}
        </ChartFrame>,
      );

      // One colour, and the title already says what is plotted. A box with a
      // single swatch restates the title and costs space.
      expect(screen.queryByText('Covers')).not.toBeInTheDocument();
    });
  });
});

describe('charts render through the frame', () => {
  const CASES = [
    {
      name: 'LineChart',
      render: () => <LineChart {...FRAME} series={[COVERS, REVENUE]} />,
    },
    {
      name: 'BarChart',
      render: () => <BarChart {...FRAME} series={[COVERS]} />,
    },
  ] as const;

  it.each(CASES)('$name carries a table toggle', ({ render }) => {
    renderWithProviders(render());

    expect(screen.getByRole('button', { name: 'Show as table' })).toBeVisible();
  });
});

describe('<SmallMultiples />', () => {
  it('names each panel, so identity never rests on colour', () => {
    renderWithProviders(
      <SmallMultiples
        chartLabel="Show as chart"
        series={[COVERS, REVENUE]}
        tableLabel="Show as table"
        title="Covers by archetype"
        xLabel="Day"
      />,
    );

    // §5.2: the ten archetypes are small multiples, NEVER ten hues. Faceting
    // works because the panel title carries the identity a hue would have had.
    expect(screen.getByRole('img', { name: /Covers: peak/ })).toBeVisible();
    expect(screen.getByRole('img', { name: /Revenue: peak/ })).toBeVisible();
  });

  it('keeps its own table toggle', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <SmallMultiples
        chartLabel="Show as chart"
        series={[COVERS, REVENUE]}
        tableLabel="Show as table"
        title="Covers by archetype"
        xLabel="Day"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Show as table' }));

    expect(screen.getByRole('table')).toBeVisible();
  });
});

describe('<Sparkline />', () => {
  it('speaks a summary, because the shape carries no text', () => {
    renderWithProviders(
      <Sparkline label="Covers" points={COVERS.points} summary="up 12% over 3 services" />,
    );

    // role="img" with a spoken summary is the whole contract. The alternative —
    // twelve table cells for a decoration — is worse for everyone, and it is
    // only legal because the tile's figure, not this, carries the value.
    expect(screen.getByRole('img', { name: 'Covers: up 12% over 3 services' })).toBeVisible();
  });

  it('renders nothing below two points', () => {
    const { container } = renderWithProviders(
      <Sparkline label="Covers" points={[{ x: 'Mon', y: 1 }]} summary="one service" />,
    );

    // A one-point trend is not a trend; drawing it would imply a direction the
    // data does not have.
    expect(container.querySelector('svg')).toBeNull();
  });
});
