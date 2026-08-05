import { ActionSpecimens } from '@/design/gallery/sections/ActionSpecimens';
import { ChartSpecimens } from '@/design/gallery/sections/ChartSpecimens';
import { DataSpecimens } from '@/design/gallery/sections/DataSpecimens';
import { ChoiceSpecimens } from '@/design/gallery/sections/ChoiceSpecimens';
import { DisplaySpecimens } from '@/design/gallery/sections/DisplaySpecimens';
import { FieldSpecimens } from '@/design/gallery/sections/FieldSpecimens';
import { NavigationSpecimens } from '@/design/gallery/sections/NavigationSpecimens';
import { OverlaySpecimens } from '@/design/gallery/sections/OverlaySpecimens';
import { ReadoutSpecimens } from '@/design/gallery/sections/ReadoutSpecimens';
import { SearchSpecimens } from '@/design/gallery/sections/SearchSpecimens';
import { TokenSpecimens } from '@/design/gallery/sections/TokenSpecimens';

/**
 * Every stage-2a primitive, in every state, in both themes and both densities.
 *
 * Lives here rather than behind a route because the router does not arrive
 * until Phase 2 — §7.2 already reserves `design/gallery/` for it, and Phase 2
 * adopts this component as `routes/design.tsx` without moving a file.
 *
 * One constraint inherited from the e2e suite, which looks arbitrary until it
 * fails: no `<h1>` anywhere below. `smoke.spec.ts` reads `page.locator('h1')`,
 * a strict-mode locator that throws on a second match, and `routes/design.tsx`
 * already owns the page's one heading.
 *
 * The Phase 1 rule against a `<table>` here is gone with `App.tsx`: it existed
 * because the density check measured `tbody tr` in DOCUMENT ORDER and a gallery
 * table would have captured that assertion. `TokenSpecimens` now carries the
 * density table itself, and the measured 44px floor lives in
 * `design.matrix.spec.ts`, which walks a named DataTable rather than the first
 * rows it finds.
 */
export function DesignGallery() {
  return (
    <div className="flex flex-col gap-48">
      {/* First, because every section below is an application of them. */}
      <TokenSpecimens />
      <ActionSpecimens />
      <FieldSpecimens />
      <ChoiceSpecimens />
      <DisplaySpecimens />
      <OverlaySpecimens />
      <NavigationSpecimens />
      <SearchSpecimens />
      <ChartSpecimens />
      <ReadoutSpecimens />
      <DataSpecimens />
    </div>
  );
}
