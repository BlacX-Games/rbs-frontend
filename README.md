# rbs-frontend

The **operator console** for _Declan's Restaurant & Bar Simulator_ — an admin dashboard covering
Live Ops, Content Catalog, Balancing, and Insights. React 19 + TypeScript + Vite, static-hosted,
talking to the `/admin/v1` surface of [`rbs-backend`](../rbs-backend).

This repo builds the **admin surface only**. Player-facing gameplay lives in the Unity client
(`rbs-game`); this console never runs the simulation, and it never writes a score, rating, or payout.

> **Status: Phase 0 complete — toolchain only.** `npm run dev` serves a placeholder shell. The design
> system arrives in Phase 1, the router and data layer in Phase 2. The full build plan is
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
  main.tsx · App.tsx · app.css     entry, placeholder shell, Tailwind pipeline
  lib/env.ts                       Zod-validated build config
test/                              Vitest — unit/ and (later) integration/
e2e/                               Playwright + axe
docs/                              GDD + IMPLEMENTATION_PLAN.md (gitignored)
```

The target layout — `routes/`, `domain/`, `api/`, `mocks/`, `design/`, `components/`, `features/` — is
specified in §7.2 of the plan and fills in from Phase 1 onward.

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
