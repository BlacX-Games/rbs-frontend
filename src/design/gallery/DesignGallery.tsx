import { ActionSpecimens } from '@/design/gallery/sections/ActionSpecimens';
import { ChartSpecimens } from '@/design/gallery/sections/ChartSpecimens';
import { ChoiceSpecimens } from '@/design/gallery/sections/ChoiceSpecimens';
import { DisplaySpecimens } from '@/design/gallery/sections/DisplaySpecimens';
import { FieldSpecimens } from '@/design/gallery/sections/FieldSpecimens';
import { NavigationSpecimens } from '@/design/gallery/sections/NavigationSpecimens';
import { OverlaySpecimens } from '@/design/gallery/sections/OverlaySpecimens';
import { ReadoutSpecimens } from '@/design/gallery/sections/ReadoutSpecimens';
import { SearchSpecimens } from '@/design/gallery/sections/SearchSpecimens';

/**
 * Every stage-2a primitive, in every state, in both themes and both densities.
 *
 * Lives here rather than behind a route because the router does not arrive
 * until Phase 2 — §7.2 already reserves `design/gallery/` for it, and Phase 2
 * adopts this component as `routes/design.tsx` without moving a file.
 *
 * Two constraints inherited from the existing e2e suite, both of which look
 * arbitrary until they fail:
 *   • No `<h1>` anywhere below. `smoke.spec.ts` reads `page.locator('h1')`,
 *     a strict-mode locator that throws on a second match.
 *   • No `<table>`. The density check measures `tbody tr` in DOCUMENT ORDER, so
 *     a table here would silently redirect that assertion at a gallery row.
 */
export function DesignGallery() {
  return (
    <div className="flex flex-col gap-48">
      <ActionSpecimens />
      <FieldSpecimens />
      <ChoiceSpecimens />
      <DisplaySpecimens />
      <OverlaySpecimens />
      <NavigationSpecimens />
      <SearchSpecimens />
      <ChartSpecimens />
      <ReadoutSpecimens />
    </div>
  );
}
