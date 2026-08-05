import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Trash2 } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from '@/components/primitives/IconButton';
import { renderWithProviders } from '../../../support/render';

/**
 * An icon-only control is the most reliable way to ship an unnamed button, so
 * `label` is a required prop and these tests exist to prove it reaches the
 * accessibility tree rather than merely the type signature.
 */
describe('<IconButton />', () => {
  it('takes its accessible name from label, and announces nothing else', () => {
    renderWithProviders(<IconButton label="Delete restaurant" icon={<Trash2 />} />);

    // `name` matching is exact here on purpose: if the glyph ever leaked into
    // the name — an un-hidden <title> in the SVG is the usual culprit — this
    // query stops resolving.
    expect(screen.getByRole('button', { name: 'Delete restaurant' })).toBeVisible();
  });

  it('defaults to type="button" like its sibling primitive', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent) => {
      event.preventDefault();
    });
    renderWithProviders(
      <form onSubmit={onSubmit}>
        <IconButton label="Delete restaurant" icon={<Trash2 />} />
      </form>,
    );

    await user.click(screen.getByRole('button', { name: 'Delete restaurant' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('is reachable and operable from the keyboard', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    renderWithProviders(
      <IconButton label="Delete restaurant" icon={<Trash2 />} onClick={onClick} />,
    );

    await user.tab();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: 'Delete restaurant' })).toHaveFocus();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('reserves a square target on both axes', () => {
    renderWithProviders(<IconButton label="Delete restaurant" icon={<Trash2 />} />);

    // jsdom loads no stylesheet (`css: false`), so this asserts the CLASS, not
    // the measured box — the real 44×44 check runs in e2e/design.matrix.spec.ts
    // against a browser. What it does catch is someone removing min-w and
    // leaving a 44×20 target that still looks fine in a screenshot.
    expect(screen.getByRole('button', { name: 'Delete restaurant' })).toHaveClass(
      'min-w-(--control-h)',
    );
  });
});
