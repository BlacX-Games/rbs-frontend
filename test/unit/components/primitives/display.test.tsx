import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tag as TagIcon } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { Avatar } from '@/components/primitives/Avatar';
import { Kbd } from '@/components/primitives/Kbd';
import { Progress } from '@/components/primitives/Progress';
import { Separator } from '@/components/primitives/Separator';
import { Skeleton } from '@/components/primitives/Skeleton';
import { Tag } from '@/components/primitives/Tag';
import { renderWithProviders } from '../../../support/render';

/**
 * The remaining display primitives, grouped because each owns one narrow
 * contract rather than a keyboard model. Badge has its own file — it carries
 * the golden-rule-9 union that the rest inherit.
 */

describe('<Tag />', () => {
  it('renders as a plain chip when it cannot be removed', () => {
    renderWithProviders(<Tag>Smoked</Tag>);

    expect(screen.getByText('Smoked')).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('names its remove button and fires on Enter', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    renderWithProviders(
      <Tag onRemove={onRemove} removeLabel="Remove Smoked">
        Smoked
      </Tag>,
    );

    await user.tab();
    await user.keyboard('{Enter}');

    // "Remove Smoked", not "Remove". A filter bar with eight tags otherwise
    // presents eight identically-named buttons.
    expect(screen.getByRole('button', { name: 'Remove Smoked' })).toBeVisible();
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('takes the control height once it contains a target', () => {
    renderWithProviders(
      <Tag onRemove={vi.fn()} removeLabel="Remove Smoked">
        Smoked
      </Tag>,
    );

    // A tag with a remove button IS a control. Shrinking it to chip height is
    // how a 20px close affordance ships, so the height is asserted rather than
    // left to whoever next adjusts the padding.
    expect(screen.getByText('Smoked').closest('span')).toHaveClass('min-h-(--control-h)');
  });

  it('carries a tone on its glyph like Badge does', () => {
    const { container } = renderWithProviders(
      <Tag icon={<TagIcon />} tone="gold">
        Signature
      </Tag>,
    );

    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass('text-gold');
  });
});

describe('<Avatar />', () => {
  it('announces the name exactly once', () => {
    renderWithProviders(<Avatar name="Danny R." src="/danny.png" />);

    // The name is on the root and the image takes alt="". Naming both would
    // announce "Danny R. Danny R." on every row of a staff table.
    expect(screen.getByRole('img', { name: 'Danny R.' })).toBeVisible();
  });

  it('falls back to initials when there is no image', () => {
    renderWithProviders(<Avatar name="Danny R." />);

    expect(screen.getByText('DR')).toBeVisible();
  });

  it('takes initials from a single-word name too', () => {
    renderWithProviders(<Avatar name="Declan" />);

    expect(screen.getByText('D')).toBeVisible();
  });

  it('sizes itself in literal pixels', () => {
    renderWithProviders(<Avatar name="Danny R." size={44} />);

    // 44 is the comfortable row height, so an avatar in a dense table lines up
    // with the row by construction rather than by a magic number.
    expect(screen.getByRole('img', { name: 'Danny R.' })).toHaveClass('size-44');
  });
});

describe('<Progress />', () => {
  it('reports its value against its maximum', () => {
    renderWithProviders(<Progress label="Catalog export" max={100} value={40} />);

    const bar = screen.getByRole('progressbar', { name: 'Catalog export' });

    expect(bar).toHaveAttribute('aria-valuenow', '40');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('claims no position when it is indeterminate', () => {
    renderWithProviders(<Progress label="Catalog export" value={null} />);

    // A bar painted at 0 asserts "no progress", which is a measurement we do
    // not have. Omitting aria-valuenow is how "unknown" is actually said.
    expect(screen.getByRole('progressbar', { name: 'Catalog export' })).not.toHaveAttribute(
      'aria-valuenow',
    );
  });

  it('bounds a value that overshoots its maximum', () => {
    renderWithProviders(<Progress label="Catalog export" max={100} value={140} />);

    const bar = screen.getByRole('progressbar', { name: 'Catalog export' });

    // Clamped for the bar AND for the announcement. "140 of 100" is not a
    // reading anyone can act on, and Radix logs an invalid-value error for it
    // that the e2e boots-clean check would fail on.
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect(bar.firstElementChild).toHaveStyle({ width: '100%' });
  });
});

describe('<Skeleton />', () => {
  it('stays out of the accessibility tree', () => {
    const { container } = renderWithProviders(<Skeleton />);

    // A skeleton is a picture of content that does not exist. Announcing it
    // reads out a paragraph of nothing; aria-busy on the container is where
    // the state actually belongs.
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders a ragged last line for multi-line text', () => {
    const { container } = renderWithProviders(<Skeleton lines={3} />);

    const bars = container.querySelectorAll('span > span');

    expect(bars).toHaveLength(3);
    expect(bars[2]).toHaveClass('w-2/3');
  });

  it('uses a pulse that ends at full opacity', () => {
    const { container } = renderWithProviders(<Skeleton />);

    // Under prefers-reduced-motion tokens.css forces one 1ms iteration, so the
    // animation's END STATE is what users see permanently. Tailwind's `pulse`
    // ends at opacity 1; an animation ending at .5 would leave every skeleton
    // half-faded for exactly the people who asked for less motion.
    expect(container.firstElementChild).toHaveClass('animate-pulse');
  });
});

describe('<Separator />', () => {
  it('says nothing by default', () => {
    renderWithProviders(<Separator />);

    // Decorative is the default because most rules are decoration, and a
    // screen reader announcing "separator" between every section is noise.
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });

  it('announces itself when it genuinely divides content', () => {
    renderWithProviders(<Separator decorative={false} orientation="vertical" />);

    expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'vertical');
  });
});

describe('<Kbd />', () => {
  it('renders a real kbd element', () => {
    renderWithProviders(<Kbd>⌘K</Kbd>);

    // The element is the point: app.css already routes `kbd` to --font-mono,
    // and AT treats it as ordinary text so "press ⌘K" reads as a sentence.
    expect(screen.getByText('⌘K').tagName).toBe('KBD');
  });
});
