import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// `globals: false` in the Vitest config means Testing Library cannot register
// its own auto-cleanup hook, so it is wired explicitly. Without this, mounted
// trees leak between test files and `getByRole` starts matching stale nodes.
afterEach(() => {
  cleanup();
});
