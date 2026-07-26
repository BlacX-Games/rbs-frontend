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

  // Phase 1 adds the light/dark and comfortable/compact projects that the
  // §5.6 accessibility contract requires; Phase 0 only needs one browser to
  // prove the harness runs.
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
