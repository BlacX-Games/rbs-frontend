import { defineConfig, devices } from '@playwright/test';

const isCI = Boolean(process.env['CI']);
// Must match `server.port` in vite.config.ts.
const PORT = 5273;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },

  /*
   * The §5.6 matrix, SCOPED rather than applied to everything.
   *
   * `*.matrix.spec.ts` runs once per theme × density; every other spec runs
   * once. Quadrupling the whole suite would buy nothing — "boots clean" and
   * "self-hosts the faces" are theme-agnostic, and the theme-mechanics tests
   * call `emulateMedia` themselves, so a project-level colorScheme there is
   * either redundant or actively misleading about what is under test.
   *
   * Density is not a Playwright `use` option, so it travels in `metadata` and
   * the fixture in e2e/fixtures.ts seeds it into localStorage before load.
   */
  projects: [
    {
      name: 'chromium',
      testIgnore: /\.matrix\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    ...(['dark', 'light'] as const).flatMap((colorScheme) =>
      (['comfortable', 'compact'] as const).map((density) => ({
        name: `${colorScheme}-${density}`,
        testMatch: /\.matrix\.spec\.ts$/,
        metadata: { density },
        use: { ...devices['Desktop Chrome'], colorScheme },
      })),
    ),
  ],

  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
