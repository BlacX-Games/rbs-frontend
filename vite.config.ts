/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

// Deliberately not Vite's default 5173: that port is contested on any machine
// running more than one Vite app, and `strictPort` below only helps if the port
// is ours. Keep it in sync with playwright.config.ts.
const DEV_SERVER_PORT = 5273;
const DEFAULT_PROXY_TARGET = 'http://localhost:3000';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      // Mirrors `paths` in tsconfig.app.json. Both must move together.
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },

    server: {
      port: DEV_SERVER_PORT,
      // Fail loudly rather than silently moving to the next free port, which
      // would strand the Playwright webServer and any bookmarked tab.
      strictPort: true,
      proxy: {
        // rbs-backend has no CORS middleware until its Phase 3, so dev talks to
        // it same-origin through this proxy and the app ships a relative
        // VITE_API_BASE_URL. Admin routes live under /admin/v1 (plan §8.4).
        '/admin': {
          target: env.VITE_DEV_PROXY_TARGET ?? DEFAULT_PROXY_TARGET,
          changeOrigin: true,
        },
      },
    },

    build: { sourcemap: true },

    // Vitest reads this file directly, so the `@` alias above has exactly one
    // definition instead of a second config drifting out of sync.
    test: {
      environment: 'jsdom',
      globals: false,
      setupFiles: ['test/setup.ts'],
      include: ['test/**/*.test.{ts,tsx}'],
      css: false,
      coverage: {
        provider: 'v8',
        include: ['src/**'],
        reporter: ['text', 'html'],
      },
    },
  };
});
