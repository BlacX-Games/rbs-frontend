# rbs-frontend

The **operator console** for _Declan's Restaurant & Bar Simulator_ — an admin dashboard covering
Live Ops, Content Catalog, Balancing, and Insights. React 19 + TypeScript + Vite, static-hosted,
talking to the `/admin/v1` surface of [`rbs-backend`](../rbs-backend).

This repo builds the **admin surface only**. Player-facing gameplay lives in the Unity client
(`rbs-game`); this console never runs the simulation, and it never writes a score, rating, or payout.

> **Status: Phase 1 in progress — design system.** Stage 1 shipped the §5.2 colour tokens for both
> themes, the theme and density mechanics, and the three self-hosted faces. Stage 2a added the
> **17 form and action primitives**; stage 2b-i adds the **9 overlay and navigation primitives** —
> Dialog, Drawer, Popover, Tooltip, DropdownMenu, Tabs, Toast, Breadcrumb, Pagination — plus the
> gallery that renders all 26 in every state, across both themes and both densities. Still to come
> in Phase 1: stage 2b-ii's four hand-built composites (Combobox, MultiSelect, CommandPalette,
> DateRangePicker), then the patterns and charts. The router and data layer follow in Phase 2.
> Full build plan: [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) §9.

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
  main.tsx · App.tsx · app.css     entry, the gallery page, Tailwind pipeline
  design/
    tokens.css                     THE source of truth for colour — both themes
    fonts.css                      @font-face for the three self-hosted faces
    theme.ts · theme-context.ts    preferences, storage, resolution
    ThemeProvider.tsx              provider; ThemeControls.tsx toggles
    gallery/                       every primitive in every state (→ /design in Phase 2)
  components/primitives/           the §5.5 primitives, one file each
    internal/                      shared class records, Field shell, useFieldIds
  lib/cn.ts · env.ts               class joiner; Zod-validated build config
public/fonts/                      committed WOFF2 + OFL licences (no CDN)
scripts/fetch-fonts.mjs            reproduces public/fonts from Google Fonts
test/                              Vitest — support/ helpers, unit/ suites
e2e/                               Playwright + axe, incl. the theme × density matrix
docs/                              GDD + IMPLEMENTATION_PLAN.md (gitignored)
```

There is deliberately **no `index.ts` barrel** under `primitives/`. Import each one directly
(`@/components/primitives/Button`) so a test pulling in one component does not drag all seventeen —
and so `patterns/` cannot start an import cycle in stage 3.

The target layout — `routes/`, `domain/`, `api/`, `mocks/`, `components/`, `features/` — is
specified in §7.2 of the plan and fills in as the phases land.

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

The 44px floor is **not** verifiable in Vitest (`css: false` means no stylesheet loads) and **not**
catchable by axe (SC 2.5.8 is 24×24 at AA; 44×44 is SC 2.5.5, which is AAA).
`e2e/design.matrix.spec.ts` measures real boxes across theme × density and is the only guard.

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
