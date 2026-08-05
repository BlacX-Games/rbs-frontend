import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { router } from '@/router';
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
 * intercepting. Rendering first would let the router's own `beforeLoad` — which
 * calls `/auth/refresh` on the very first navigation — race that registration,
 * and a request that slips past lands on the Vite dev server as a 404. The
 * operator would be bounced to sign-in on a session that was perfectly valid.
 *
 * Dynamic import so `src/mocks/` and its fixtures never enter a production
 * bundle: with `VITE_USE_MOCKS=false` this branch is dead code, and the whole
 * mock network splits into a chunk nothing loads.
 */
async function bootstrap(): Promise<void> {
  if (env.useMocks) {
    const { startMockNetwork } = await import('@/mocks/browser');
    await startMockNetwork();
  }

  createRoot(rootElement as HTMLElement).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}

void bootstrap();
