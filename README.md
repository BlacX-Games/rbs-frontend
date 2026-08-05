# rbs-frontend

The **operator console** for _Declan's Restaurant & Bar Simulator_ — an admin dashboard covering
Live Ops, Content Catalog, Balancing, and Insights. React 19 + TypeScript + Vite, static-hosted,
talking to the `/admin/v1` surface of [`rbs-backend`](../rbs-backend).

This repo builds the **admin surface only**. Player-facing gameplay lives in the Unity client
(`rbs-game`); this console never runs the simulation, and it never writes a score, rating, or payout.

> **Status: Phase 2 complete — a navigable console on live mock data.** Phase 1's design system
> now sits under an actual application: the §4 route tree, the app shell, sign-in, `AdminApi` over a
> single fetch wrapper, an MSW mock network that **enforces the role matrix**, and the Live Ops
> proving slice — `/ops` and `/ops/players` reading real data end to end, with every filter, sort,
> page cursor, and open drawer in the URL.
>
> `rbs-backend` has no admin API and no phase that promises one — a full-text search of its `src/`,
> `docs/`, `prisma/`, `CLAUDE.md`, and git history returns zero occurrences of `admin`. So
> `src/mocks/handlers.ts` is not a placeholder for a specification; it **is** the specification, and
> the work-order that repo will be handed.
>
> Every other §4 route resolves and renders a placeholder naming the phase that builds it, so
> walking the console tells you what is finished rather than leaving a blank page to interpret.
>
> **Next: Phase 3–4 (BE) — admin identity and the cross-tenant read plane**, then Phase 5 turns the
> Live Ops slice into the full module on real data. Full build plan:
> [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) §9.

## Prerequisites

- Node **≥ 22**
- For live data (Phase 5 onward): a running `rbs-backend` on `http://localhost:3000`

## Getting started

```bash
npm install
cp .env.example .env      # optional — every var has a working default
npm run dev               # http://localhost:5273
```

The dev server uses **5273**, not Vite's default 5173, so it never fights another Vite app for the
port — and `strictPort` then means a failure to bind is a real problem worth seeing.

## Scripts

| Script                                      | Does                                                               |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `npm run dev`                               | Vite dev server on `:5273`, with `/admin/*` proxied to the backend |
| `npm run build`                             | `tsc -b` then `vite build`                                         |
| `npm run preview`                           | Serve the production build                                         |
| `npm run typecheck`                         | `tsc -b` across both project references                            |
| `npm run lint` / `lint:fix`                 | ESLint, type-aware (`recommendedTypeChecked`)                      |
| `npm run format` / `format:check`           | Prettier                                                           |
| `npm test` / `test:watch` / `test:coverage` | Vitest (jsdom + Testing Library)                                   |
| `npm run test:e2e`                          | Playwright + axe (needs `npx playwright install chromium` once)    |

The gate before any commit: `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`.

## Environment

All vars are documented in [`.env.example`](.env.example) and validated at startup by
`src/lib/env.ts` — a bad value fails loudly rather than surfacing later as a mystery 404.

| Var                     | Default                 | Notes                                                               |
| ----------------------- | ----------------------- | ------------------------------------------------------------------- |
| `VITE_API_BASE_URL`     | _(empty)_               | Prefix for `/admin/v1/...`. Empty = same-origin. No trailing slash. |
| `VITE_USE_MOCKS`        | `true`                  | Serve the MSW mock network instead of a real backend.               |
| `VITE_DEV_PROXY_TARGET` | `http://localhost:3000` | Dev-server only; never read by the app.                             |

Dev talks to the backend **same-origin through the Vite `/admin` proxy**, because `rbs-backend` has
no CORS middleware until its own Phase 3.

## Layout

```
src/
  main.tsx · router.tsx · app.css  entry, the router, Tailwind pipeline
  routes/                          file-based routes mirroring §4 (routeTree.gen.ts is generated)
    __root.tsx                     providers, skip link, crash boundary, 404
    _console.tsx                   the auth wall + AppShell; pathless, so URLs stay §4's
    signin.tsx · design.tsx        the two routes outside the wall
  app/
    AppShell · NavRail · TopBar    rail, breadcrumb, ⌘K, environment badge, account menu
    navigation.ts                  THE route table — rail, palette, breadcrumb, and guard read it
    RequireCapability · PhasePlaceholder
  api/
    client.ts                      the one fetch: bearer, refresh-on-401, error envelope, schema parse
    adapter.ts · endpoints.ts      the AdminApi contract, and its one implementation
    session.ts · queries.ts        the in-memory token; query keys, invalidation, client defaults
  domain/
    enums.ts · flavor.ts           wire value → display label; the ten canonical dimensions
    schemas/ · types.ts            Zod is the source; types are inferred from it
  mocks/
    handlers.ts · fixtures.ts      the /admin/v1 spec, and a deterministic universe
  i18n/
    en.ts · t.ts · format.ts       the catalogue; key + params checked at compile time
  design/
    tokens.css                     THE source of truth for colour — both themes
    fonts.css                      @font-face for the three self-hosted faces
    theme.ts · theme-context.ts    preferences, storage, resolution
    ThemeProvider.tsx              provider; ThemeControls.tsx toggles
    gallery/                       every primitive in every state — served at /design
  components/primitives/           the §5.5 primitives, one file each
    internal/                      shared class records, Field shell, useFieldIds
  components/charts/               ChartFrame + the nine visx chart types
    chart.ts                       series types, slot→var(--series-N), mark specs
    internal/                      axes, the table-view twin
  components/patterns/             the 15 §5.5 composed patterns
    internal/                      tier bands, CSV escaping, the JSON diff
  lib/
    money.ts                       exact decimal arithmetic — no float ever touches a currency
    number.ts                      roundHalfUp, away from zero, mirroring Unity
    permissions.ts · ratelimit.ts  the §8.2 matrix; the draft-8 headers
    cn.ts · env.ts                 class joiner; Zod-validated build config
public/fonts/                      committed WOFF2 + OFL licences (no CDN)
scripts/fetch-fonts.mjs            reproduces public/fonts from Google Fonts
test/                              Vitest — support/ helpers, unit/ suites
e2e/                               Playwright + axe, incl. the theme × density matrix
docs/                              GDD + IMPLEMENTATION_PLAN.md (gitignored)
```

There is deliberately **no `index.ts` barrel** under `primitives/`. Import each one directly
(`@/components/primitives/Button`) so a test pulling in one component does not drag all seventeen —
and so `patterns/` cannot start an import cycle in stage 3.

```
  features/
    ops/                           the §6.1 module — home, players list, peek, detail
```

`features/catalog`, `balancing`, `insights`, and `system` fill in from Phase 6 onward.

### Working with the design system

**Never write a hex literal outside `src/design/tokens.css`.** Use the Tailwind utilities it
generates — `bg-surface`, `text-ink`, `border-hairline`, `text-gold-text`, `fill-series-3` — which
resolve to `var(--…)` and therefore follow the theme with no JavaScript. Charts pass the same custom
properties straight into SVG `fill`/`stroke`. The stock Tailwind palette is switched off, so
`bg-blue-500` does not exist.

Four things to know before reaching for a colour:

- **`--gold-accent` vs `--gold-text`.** On the paper theme these differ. The accent clears 3:1 (UI,
  borders, large numerals); only `--gold-text` clears 4.5:1 for body-size text and links.
- **`--polarity-neutral` is a mark colour, never text.** It clears 3:1, not 4.5:1, in both themes —
  so meters and glyphs carry the polarity while the label stays in ordinary ink.
- **`--control-edge` bounds interactive controls; `--border-default` bounds everything else.** A
  hairline measures 1.39:1 dark / 1.33:1 light, and on a form control the border _is_ the affordance
  that identifies it, which WCAG 2.2 SC 1.4.11 puts at 3:1. Decorative rules keep the hairline.
- **`--danger-ink` is the only ink token that flips between themes**, because `--polarity-bad` does:
  a light red on dark, a dark red on paper. No single ink survives both.

Spacing utilities are **pixel-valued**: `--spacing` is `1px`, so `p-16` is 16px and `gap-8` is 8px,
matching the §5.4 scale (`2 4 8 12 16 24 32 48 64 96`) rather than Tailwind's usual 4× step.

### Writing a primitive

- **`min-h-(--control-h)`, never `h-`.** §5.6 wants a 44×44 floor in comfortable density _and_ no
  fixed-height text containers at +30% text expansion. `min-h` is the only reading that honours both.
  Interactive primitives get **no `size` prop** — density is the operator's preference, and a
  per-instance `size="sm"` is an escape hatch from an accessibility contract.
- **No hard-coded user-visible strings.** Every label arrives as a prop, and is _required_ wherever a
  control is meaningless without one. `contract.test.tsx` fails the build if a component renders text
  the caller did not supply.
- **Status is never colour alone**, and it is the type system that enforces it: a non-neutral `tone`
  requires an `icon`. Tone colours the glyph; the label stays `text-ink`.
- **`className` is additive.** `cn()` appends and does not merge — anything the component owns is
  changed through a prop, not an override.
- **Radix props need conditional spreading.** `exactOptionalPropertyTypes` rejects
  `<Radix.Root value={maybeUndefined}>`; use `{...(value !== undefined && { value })}`. Widening your
  own prop does not help — the strict side is theirs.
- **Check Radix's default strings.** Several primitives ship hard-coded English — the Toast viewport
  defaults to `"Notifications ({hotkey})"` — which would go out untranslated. Where one exists, take
  it as a required prop instead.
- **Overlays owe one contract**, shared via `internal/overlay.ts`: portalled, `Esc` closes, focus
  returns to the trigger. `overlay.test.tsx` asserts it across all of them at once; a new overlay
  belongs in that table.
- **Never put `text-ink-tertiary` on TEXT inside an overlay.** §5.2 measures ink against
  `--bg-canvas`, but `--bg-overlay` is lighter on the dark theme and tertiary drops from 5.31:1 to
  **4.43:1** — under the body-text floor. Use `text-ink-secondary` there. Tertiary is still fine for
  glyphs, which are graphical objects at a 3:1 gate. The full ink × surface matrix is asserted in
  `contrast.test.ts`.
- **Dates cross the wire as `YYYY-MM-DD` strings**, never as a `Date` — a `Date` is an instant, not
  a day, and local-midnight construction sends the wrong day from half the world's timezones. All
  arithmetic lives in `internal/calendar.ts` and is UTC-only.

The 44px floor is **not** verifiable in Vitest (`css: false` means no stylesheet loads) and **not**
catchable by axe (SC 2.5.8 is 24×24 at AA; 44×44 is SC 2.5.5, which is AAA).
`e2e/design.matrix.spec.ts` measures real boxes across theme × density and is the only guard.

### Working with the router and the shell

- **`src/app/navigation.ts` is the route table**, and four things read it: the rail, the breadcrumb,
  the ⌘K palette, and the capability guard. Adding a screen means adding a row there _and_ a file
  under `src/routes/`. A route file without a row still resolves, and `AppShell` gates it on
  `ops.read` — fail-closed, so the mistake surfaces as a `ForbiddenState` for an analyst rather than
  as a screen open to every role.
- **`routeTree.gen.ts` is generated and gitignored.** `@tanstack/router-plugin` rebuilds it on `dev`
  and on `build`, so a fresh clone produces it before anything imports it. Same reasoning as
  `rbs-backend`'s gitignored `openapi.json`: derived files go stale, and a committed one is a diff on
  every branch that adds a route.
- **Two ESLint rules are off under `src/routes/**`**, and only there. Every route file must export a
  `Route` object beside its component (`react-refresh/only-export-components`), and `beforeLoad`
  signals a redirect with `throw redirect({…})`, which is not an `Error`
  (`@typescript-eslint/only-throw-error`). Both are TanStack's contract, not our style.
- **Hiding a rail entry is not a permission check.** §7.4: a forbidden route still resolves and
  renders `ForbiddenState`. Someone who bookmarked a screen before their role changed gets an
  explanation, not a blank page — and the server refuses the data either way.
- **The access token lives in a module variable and nowhere else.** Never `localStorage`, never
  `sessionStorage`. A reload loses it, which is what the httpOnly refresh cookie is for; a readable
  `rbs_admin_session` hint cookie rides beside it so an anonymous load does not spend an
  `/auth/*` rate-limit slot discovering there is no session.
- **The app does not render synchronously.** `main.tsx` awaits the MSW worker before the first
  render, so the router's `beforeLoad` cannot fire a request the worker is not yet intercepting. In
  Playwright, `expect(locator)` auto-waits and does not care; `locator.count()`, `locator.all()`, and
  `keyboard.press()` do — use `appReady(page)` from `e2e/fixtures.ts` before any of those.

### Writing a screen

- **URL state, not component state.** §4: every filter, sort, page cursor — and the open peek
  drawer — lives in typed search params, so any view is a link. `features/ops/players-search.ts` is
  the pattern: a Zod schema on the route's `validateSearch`, with `.catch(undefined)` on every
  field so a stale bookmark degrades to an unfiltered list rather than an error page.
- **`DataTable` sorts client-side by default and must not for a paginated list.** Pass `sorting` +
  `onSortingChange` to take control: ordering the loaded fifty rows of seventy-four would present
  "the oldest account" as the oldest of an arbitrary page.
- **One request per screen, not one per panel.** A detail route that fires six queries shows six
  spinners and six independent failures, and the operator watches the page assemble itself.
- **Money arrives as a string and stays one.** `formatMoney` takes the wire value — `"18"`, unpadded
  — and formats it exactly. Nothing calls `Number()` on a currency field, including on the way into
  a chart; `toMinorUnits` is the seam where a figure becomes a coordinate.
- **`null` is not zero.** A satisfaction average with no services, a percentage with no revenue base
  — these render as an em dash. `0` would report that every guest hated a service that never ran.
- **Player email is the only plaintext PII in the schema.** Role-gated behind `gdpr.act`, masked
  until deliberately revealed per record, absent from the peek drawer entirely, and masked in the
  CSV export — an export must not become a route around the gate.

### Visual regression

`e2e/design.visual.spec.ts` snapshots each of the 17 gallery sections in both themes — 34 baselines
under `e2e/design.visual.spec.ts-snapshots/`.

- **Per section, not per page.** The gallery is ~20,000px tall; one image would mean any one-pixel
  change fails everything with an unreadable diff. Section-sized images give failure locality.
- **Both themes, one density.** Density changes every control's _height_, and
  `e2e/design.matrix.spec.ts` already measures that with `boundingBox()` in all four combinations —
  a measured 44px floor beats a picture of one.
- **Baselines are platform-suffixed** (`…-chromium-linux.png`). CI on another OS regenerates its
  own rather than silently comparing against these, so a first-run CI failure there is not a
  regression.
- **A failure means "look at this", never "revert this".** These catch unintended visual change;
  whether the new rendering is _better_ is a design decision. Re-baseline with
  `npx playwright test design.visual --update-snapshots`.
- Snapshots run under emulated reduced motion, so nothing is mid-transition. That is also why
  `RadarChart` draws in a fixed `viewBox` rather than in measured pixels — geometry that depends on
  a container's settled width is not reproducible, and this suite is what found it.

### Writing a chart

- **Every chart has a table-view twin, and it is not optional.** §5.2's relief rule PASSes
  `--series-3` (2.77:1) and `--series-5` (2.65:1) on the paper theme _only on condition_ that a
  chart using them ships visible labels or a table view. `ChartFrame` renders the toggle, so a chart
  built through it cannot ship without one.
- **Slots belong to entities, never to array position.** `seriesColor(slot)` returns the string
  `var(--series-3)` — there is no colour array in JS to drift from `tokens.css`. Colouring by index
  means filtering one series repaints the survivors, and a reader who learned "Barbecue is blue" is
  then misled.
- **Never a dual y-axis.** Two measures of different scale become two charts, small multiples, or
  both indexed to a common base. It is the single most misleading thing a chart can do.
- **Eight slots is the ceiling.** A ninth generated hue is indistinguishable from an existing one
  under CVD. Fold the tail into "Other", or facet with `SmallMultiples` — which is what §5.2 requires
  for the ten guest archetypes.
- **Sequential is one hue light→dark; diverging is two hues plus a neutral gray midpoint.** Never a
  rainbow, never a hue at the midpoint. `Heatmap` is sequential; `HealthMeter` (3b) is diverging.
- **Text wears text tokens, never the series colour.** A light categorical hue is illegible as type
  on the surface. Identity comes from a swatch or line key _beside_ the text.
- **Marks are fixed** in `chart.ts`'s `MARK`: 2px lines, ≥8px markers, ≤24px bars with a 4px rounded
  data-end, a 2px surface gap between touching fills, a 2px surface ring on overlapping dots, and a
  10% area wash. Never a stroke around a mark to separate it — the gap and the ring are the mechanism.

## Conventions

- **TypeScript strict** and then some: `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitOverride`. Matches `rbs-backend` so moving between the repos costs nothing.
- **Money is a string end-to-end.** `Decimal(12,2)` does not round-trip through IEEE-754; no
  `parseFloat` on a currency field, anywhere.
- **Never colour alone.** Every status pairs colour with an icon or shape (WCAG 2.2 AA, verified by
  the axe pass).
- **No PII in logs or telemetry**, and no OpenAI key ever reaches this bundle.

The full rule set is §2 of the plan; the backend's are in [`rbs-backend/CLAUDE.md`](../rbs-backend/CLAUDE.md).

---

_Original concept by Declan Struthers._
