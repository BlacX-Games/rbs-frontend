/// <reference types="vite/client" />

/**
 * Editor-facing shape of the vars this app reads. The runtime authority is the
 * Zod schema in `src/lib/env.ts`; this only buys completion and typo-catching
 * at the `import.meta.env` access site.
 */
interface ImportMetaEnv {
  /** Base URL the API client prefixes onto `/admin/v1/...`; empty = same-origin. */
  readonly VITE_API_BASE_URL?: string;
  /** `'true'` | `'false'` — serve the MSW mock network instead of a real backend. */
  readonly VITE_USE_MOCKS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
