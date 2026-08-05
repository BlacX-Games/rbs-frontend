import { X } from 'lucide-react';
import { Toast as RadixToast } from 'radix-ui';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { IconButton } from '@/components/primitives/IconButton';
import { TONE_GLYPH } from '@/components/primitives/internal/control';
import { OVERLAY_SURFACE } from '@/components/primitives/internal/overlay';
import {
  ToastContext,
  type ToastContextValue,
  type ToastOptions,
} from '@/components/primitives/internal/toast-context';

/**
 * An intersection, not `interface ... extends`.
 *
 * `ToastOptions` is a UNION — golden rule 9's tone/icon discrimination makes it
 * one — and an interface cannot extend a union. The intersection distributes
 * over both branches, so a queued toast still requires an icon whenever it
 * carries a tone.
 */
type QueuedToast = ToastOptions & { readonly id: string };

/**
 * Mount once, near the root. `useToast()` reaches it from anywhere below.
 *
 * An imperative hook rather than declarative `<Toast>` elements, because the
 * things that raise one — a failed save, a published balancing version, a
 * rate-limit countdown — happen in an event handler, not in a render. Making
 * callers hold their own visibility state is how toasts end up stuck on screen.
 */
export function ToastProvider({
  children,
  closeLabel,
  viewportLabel,
  duration = 5000,
}: {
  readonly children: ReactNode;
  /** Accessible name for every toast's ✕ — user-visible, so it is required. */
  readonly closeLabel: string;
  /**
   * Names the toast region. REQUIRED, because Radix's default is the
   * hard-coded English string "Notifications ({hotkey})" — a string that would
   * ship untranslated and that §5.6's "externalize all UI strings" forbids.
   * Radix substitutes `{hotkey}` if the label contains it.
   */
  readonly viewportLabel: string;
  readonly duration?: number;
}) {
  const [toasts, setToasts] = useState<readonly QueuedToast[]>([]);

  // A counter, not Math.random: ids only need to be unique within this session,
  // and a deterministic sequence keeps test output stable.
  const nextId = useRef(0);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    nextId.current += 1;
    const id = `toast-${String(nextId.current)}`;

    setToasts((current) => [...current, { ...options, id }]);
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext value={value}>
      <RadixToast.Provider duration={duration} swipeDirection="right">
        {children}

        {toasts.map((item) => (
          <RadixToast.Root
            className={[
              OVERLAY_SURFACE,
              'flex items-start gap-8 p-16',
              'animate-slide-in-right motion-reduce:animate-fade-in',
              'data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x)',
              'data-[swipe=cancel]:translate-x-0',
            ].join(' ')}
            duration={item.duration ?? duration}
            key={item.id}
            onOpenChange={(open) => {
              if (!open) dismiss(item.id);
            }}
          >
            {item.icon === undefined ? null : (
              // Golden rule 9 again, and it matters more here than anywhere: a
              // toast is transient, so a colour an operator half-sees is the
              // only signal they get. The glyph carries the tone; the title
              // stays ink.
              <span
                aria-hidden={true}
                className={`contents [&_svg]:size-16 ${TONE_GLYPH[item.tone ?? 'neutral']}`}
              >
                {item.icon}
              </span>
            )}

            <div className="flex min-w-0 flex-1 flex-col gap-4">
              <RadixToast.Title className="text-ink text-base font-medium">
                {item.title}
              </RadixToast.Title>

              {item.description === undefined ? null : (
                <RadixToast.Description className="text-ink-secondary text-sm">
                  {item.description}
                </RadixToast.Description>
              )}

              {item.action === undefined ? null : (
                <RadixToast.Action
                  altText={item.action.label}
                  asChild
                  // Radix requires altText so a screen-reader user has an
                  // alternative route to the action — a toast may vanish before
                  // they reach it.
                  className="text-gold-text mt-4 self-start text-sm underline underline-offset-4"
                >
                  <button onClick={item.action.onClick} type="button">
                    {item.action.label}
                  </button>
                </RadixToast.Action>
              )}
            </div>

            <RadixToast.Close asChild>
              <IconButton icon={<X />} label={closeLabel} />
            </RadixToast.Close>
          </RadixToast.Root>
        ))}

        {/*
          The viewport is an `ol` with role="region" that Radix labels and keeps
          reachable via F6. Bottom-right, and above every overlay's z-50 — a
          toast reporting a failed save must not be hidden by the dialog that
          raised it.
        */}
        <RadixToast.Viewport
          className="fixed right-16 bottom-16 z-[60] flex w-[min(24rem,calc(100vw-32px))] flex-col gap-8 outline-none"
          label={viewportLabel}
        />
      </RadixToast.Provider>
    </ToastContext>
  );
}
