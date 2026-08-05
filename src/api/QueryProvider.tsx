import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { createQueryClient } from '@/api/queries';

/**
 * Created in state, not at module scope.
 *
 * A module-scoped client is shared by every test in a file, so one suite's
 * cached 403 becomes the next suite's mystery. In the app there is exactly one
 * provider, so the lazy initialiser runs once either way — this costs nothing
 * and makes the test isolation free.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
