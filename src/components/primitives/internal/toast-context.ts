import { createContext, use } from 'react';
import type { ToneProps } from '@/components/primitives/internal/control';

/**
 * Context and hook in a `.ts`, away from the component.
 *
 * `react-refresh/only-export-components` fires on any module exporting both a
 * component and a hook, and Fast Refresh genuinely cannot preserve state across
 * an edit to such a file — the same split `theme-context.ts` already makes.
 */

export type ToastOptions = ToneProps & {
  readonly title: string;
  readonly description?: string;
  /** One action, not many. A toast with a decision tree should be a Dialog. */
  readonly action?: { readonly label: string; readonly onClick: () => void };
  /** Milliseconds. Omit for the provider's default. */
  readonly duration?: number;
};

export interface ToastContextValue {
  readonly toast: (options: ToastOptions) => void;
  readonly dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const value = use(ToastContext);

  if (value === null) {
    throw new Error('useToast must be used inside <ToastProvider>.');
  }

  return value;
}
