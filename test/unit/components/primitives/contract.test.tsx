import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PRIMITIVE_CASES, SENTINEL } from '../../../support/primitives';
import { renderWithProviders } from '../../../support/render';

/**
 * The contract every primitive owes, asserted once across all of them.
 *
 * The per-primitive suites test what each one uniquely does. This file tests
 * what none of them may stop doing — and the string-free case in particular is
 * a real i18n regression test rather than a formality: §5.6 requires
 * externalized strings "from day one", and §7.4 warns that retrofitting is what
 * makes localization expensive. The moment someone hard-codes "Loading…" into a
 * primitive, this fails.
 */
describe('primitive contract', () => {
  describe.each(PRIMITIVE_CASES)('$name', ({ role, supplied, render, focusable }) => {
    it('resolves under its role with exactly the name it was given', () => {
      renderWithProviders(render());

      // `getByRole` throws on both zero and multiple matches, so an exact name
      // match here also rules out a duplicate rendering of the same control.
      if (role === 'generic') {
        expect(screen.getByText(SENTINEL)).toBeVisible();
        return;
      }

      expect(screen.getByRole(role, { name: SENTINEL })).toBeVisible();
    });

    it('renders no text beyond the strings it was handed', () => {
      const { container } = renderWithProviders(render());

      // Everything the caller supplied is removed; whatever survives was baked
      // into the component and cannot be translated.
      const leftover = supplied
        .reduce((text, value) => text.replaceAll(value, ''), container.textContent ?? '')
        .trim();

      expect(leftover, 'un-externalized string in the component').toBe('');
    });

    it('appends the caller className without discarding its own', () => {
      const { container } = renderWithProviders(render());

      // The contract of `lib/cn.ts` at the component boundary. Every case
      // passes className="probe"; if a primitive drops it, a consumer's layout
      // class silently does nothing.
      expect(container.querySelector('.probe')).toBeInTheDocument();
    });

    it(focusable ? 'is reachable with Tab' : 'is not a tab stop', async () => {
      const user = userEvent.setup();
      renderWithProviders(render());

      await user.tab();

      const active = document.activeElement;

      if (focusable) {
        expect(active, 'nothing took focus').not.toBe(document.body);
      } else {
        // A display primitive in the tab order is a dead stop an operator has
        // to press through on every pass down a dense table.
        expect(active).toBe(document.body);
      }
    });
  });
});
