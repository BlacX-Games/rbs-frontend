/**
 * The surfaces every portalled overlay shares.
 *
 * A `.ts` for the same reason as `control.ts`: these are object consts, and
 * `react-refresh/only-export-components` rejects exporting one beside a
 * component.
 *
 * §5.6 states the overlay contract in one line — "Esc closes every overlay,
 * focus returns to the trigger" — and Radix supplies both. What is ours is
 * everything below: the surface, the scrim, the motion, and making sure the
 * whole thing survives a high-contrast theme.
 */

/**
 * Popover, DropdownMenu, and Select content.
 *
 * `bg-overlay` rather than `bg-raised`: an overlay floats above content it must
 * not blend into. It is the only surface token with that job, which is why the
 * palette has four rather than three.
 *
 * The `forced-colors` pair is not decoration. Stage 2a's high-contrast axe pass
 * found a filled control rendering at 1.06:1 because Chromium forces
 * `background-color` but leaves a `color` arriving through a custom property.
 * A portalled surface has the same exposure, and worse consequences — a menu
 * that paints its own background disappears into the system canvas entirely.
 * `Canvas`/`CanvasText` are system keywords, which is why they are not tokens.
 */
export const OVERLAY_SURFACE = [
  'border-rule bg-overlay text-ink z-50 rounded-md border shadow-3',
  'forced-colors:border-[CanvasText] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]',
].join(' ');

/**
 * The scrim behind a modal.
 *
 * `--scrim` is already alpha-composited per theme (0.72 on dark, 0.44 on
 * paper), so it dims without hiding — an operator confirming a GDPR deletion
 * needs to still see which player they are looking at.
 */
export const OVERLAY_SCRIM = [
  'bg-scrim fixed inset-0 z-40',
  'animate-fade-in',
  // Forced colours give the scrim no contract to keep, and a semi-transparent
  // black over a forced canvas reads as a rendering fault. Hide it and let the
  // dialog's own border carry the separation.
  'forced-colors:hidden',
].join(' ');

/**
 * Enter motion for a floating surface.
 *
 * The `motion-reduce:` swap is what makes §5.4's "transforms are dropped —
 * opacity only" literally true. Collapsing the duration to 1ms alone would keep
 * the transform, merely too fast to see, which is a different promise from the
 * one the spec makes to someone with a vestibular disorder.
 */
export const OVERLAY_MOTION = 'animate-scale-in motion-reduce:animate-fade-in';

/**
 * One menu or listbox row.
 *
 * `min-h-(--control-h)`, because a menu item is a target like any other — this
 * is the row an operator taps to delete a restaurant.
 */
export const OVERLAY_ITEM = [
  'flex min-h-(--control-h) items-center gap-8 rounded-sm px-8',
  'text-base outline-none select-none',
  'data-[highlighted]:bg-raised data-[highlighted]:text-ink',
  'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
  // Highlight is a background change, which forced colours flatten away. The
  // system's own Highlight pair is the only thing that reads there.
  'forced-colors:data-[highlighted]:bg-[Highlight]',
  'forced-colors:data-[highlighted]:text-[HighlightText]',
].join(' ');
