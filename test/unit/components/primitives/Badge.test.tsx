import { screen } from '@testing-library/react';
import { CircleCheck, TriangleAlert } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { Badge } from '@/components/primitives/Badge';
import { renderWithProviders } from '../../../support/render';

/**
 * Golden rule 9 — "status is never colour alone" — at both ends.
 *
 * The compile-time half is a discriminated union, so the strongest assertion in
 * this file is the @ts-expect-error below: it fails the BUILD if the union ever
 * stops requiring an icon, which no runtime test could catch.
 */
describe('<Badge />', () => {
  it('renders a plain chip with no tone at all', () => {
    renderWithProviders(<Badge>Draft</Badge>);

    expect(screen.getByText('Draft')).toBeVisible();
  });

  it('requires an icon for any tone that carries meaning', () => {
    renderWithProviders(
      <>
        {/*
          A non-neutral tone without an icon is a TYPE ERROR. If this directive
          ever reports itself as unused, the union has been widened and rule 9
          is no longer enforced by anything.
        */}
        {/* @ts-expect-error golden rule 9: tone="bad" requires an icon */}
        <Badge tone="bad">Over target</Badge>
      </>,
    );

    expect(screen.getByText('Over target')).toBeVisible();
  });

  it('pairs the tone with a glyph when one is given', () => {
    const { container } = renderWithProviders(
      <Badge icon={<TriangleAlert />} tone="bad">
        Over target
      </Badge>,
    );

    // The glyph is the non-colour channel. Present, and hidden from AT because
    // the adjacent text already says what it means.
    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(screen.getByText('Over target')).toBeVisible();
  });

  it('colours the glyph and leaves the label in ink', () => {
    const { container } = renderWithProviders(
      <Badge icon={<CircleCheck />} tone="good">
        Under target
      </Badge>,
    );

    const glyphWrapper = container.querySelector('[aria-hidden="true"]');

    // Measured on --bg-raised, `critical` is 3.66:1 on dark and `gold` 3.51:1
    // on paper — fine for a graphical object, below the 4.5:1 text gate. So the
    // tone class must land on the glyph wrapper and never on the badge itself.
    expect(glyphWrapper).toHaveClass('text-good');
    expect(screen.getByText('Under target').closest('span')).toHaveClass('text-ink');
  });
});
