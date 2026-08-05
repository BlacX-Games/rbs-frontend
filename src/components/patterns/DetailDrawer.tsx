import type { ReactElement, ReactNode } from 'react';
import { Drawer } from '@/components/primitives/Drawer';

export interface DetailField {
  readonly label: string;
  readonly value: ReactNode;
  /** Mono for ids, hashes and UUIDs — the JetBrains Mono case from §5.3. */
  readonly mono?: boolean;
}

export type DetailDrawerProps = {
  readonly title: string;
  readonly description?: string;
  readonly trigger?: ReactElement;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly closeLabel: string;
  /** The at-a-glance pairs. Anything longer belongs in `children`. */
  readonly fields?: readonly DetailField[];
  readonly footer?: ReactNode;
  readonly children?: ReactNode;
  readonly className?: string;
};

/**
 * The §4 peek: fast triage without losing the list.
 *
 * A thin layout over `Drawer` rather than a second overlay, so the focus trap,
 * Esc handling, and focus return are the ones already proven by
 * `overlay.test.tsx`. What this adds is the label/value rhythm every peek
 * shares, so twelve detail screens do not each invent their own.
 *
 * It deliberately owns NO URL. §4 pairs the peek with a full detail route, and
 * the route is the shareable half — a drawer that wrote to the address bar
 * would compete with it and make "preserves scroll and filter state" a lie.
 */
export function DetailDrawer({
  title,
  description,
  trigger,
  open,
  onOpenChange,
  closeLabel,
  fields,
  footer,
  children,
  className,
}: DetailDrawerProps) {
  return (
    <Drawer
      closeLabel={closeLabel}
      title={title}
      {...(description !== undefined && { description })}
      {...(trigger !== undefined && { trigger })}
      {...(open !== undefined && { open })}
      {...(onOpenChange !== undefined && { onOpenChange })}
      {...(footer !== undefined && { footer })}
      {...(className !== undefined && { className })}
    >
      <div className="flex flex-col gap-16">
        {fields === undefined || fields.length === 0 ? null : (
          // A description list, because that is what label/value pairs ARE.
          // A grid of divs reads to a screen reader as a run of unrelated
          // strings with no indication which value belongs to which label.
          <dl className="grid grid-cols-[auto_1fr] gap-x-16 gap-y-8">
            {fields.map((field) => (
              <div className="contents" key={field.label}>
                <dt className="text-ink-tertiary text-xs font-medium">{field.label}</dt>
                <dd
                  className={
                    field.mono === true
                      ? 'text-ink font-mono text-sm break-all'
                      : 'text-ink text-sm'
                  }
                >
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {children}
      </div>
    </Drawer>
  );
}
