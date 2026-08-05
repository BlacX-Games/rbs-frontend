import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/App';
import { ThemeProvider } from '@/design/ThemeProvider';
import { env } from '@/lib/env';
import './app.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    'Missing #root — index.html must provide the mount point before the bundle runs.',
  );
}

/**
 * The mock network starts BEFORE React mounts, and the `await` is load-bearing.
 *
 * `worker.start()` resolves only once the service worker is actually
 * intercepting. Rendering first would let the first wave of queries race that
 * registration, and a request that slips past lands on the Vite dev server as a
 * 404 — indistinguishable, on screen, from an endpoint we forgot to write.
 *
 * Dynamic import so `src/mocks/` and its fixtures never enter a production
 * bundle: with `VITE_USE_MOCKS=false` this branch is dead code, and Rolldown
 * splits the whole mock network into a chunk nothing loads.
 */
async function bootstrap(): Promise<void> {
  if (env.useMocks) {
    const { startMockNetwork } = await import('@/mocks/browser');
    await startMockNetwork();
  }

  createRoot(rootElement as HTMLElement).render(
    <StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </StrictMode>,
  );
}

void bootstrap();
