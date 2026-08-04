import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface Crumb {
  readonly label: string;
  /** Omit on the final crumb — the current page is not a link to itself. */
  readonly href?: string;
}

export type BreadcrumbProps = {
  /** Names the nav landmark. Required — a page may hold several. */
  readonly label: string;
  readonly items: readonly Crumb[];
  readonly className?: string;
};

/**
 * The top-bar trail from §4.
 *
 * An ordered list inside a labelled `nav`, because the order is the meaning.
 * A row of divs would read to a screen reader as four unrelated links with no
 * hint that they describe a path.
 *
 * The separator is an `aria-hidden` glyph rather than a `::before` content
 * string: CSS-generated text is announced by some screen readers, and "chevron
 * right" between every crumb is noise.
 */
export function Breadcrumb({ label, items, className }: BreadcrumbProps) {
  return (
    <nav aria-label={label} className={className}>
      <ol className="flex flex-wrap items-center gap-4">
        {items.map((crumb, index) => {
          const isLast = index === items.length - 1;

          return (
            <li className="flex items-center gap-4" key={crumb.label}>
              {index === 0 ? null : (
                <ChevronRight aria-hidden={true} className="text-ink-tertiary size-16 shrink-0" />
              )}

              {isLast || crumb.href === undefined ? (
                // `aria-current="page"` is what tells a screen reader which
                // crumb is where you actually are — without it the trail
                // describes a path with no "you are here".
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={cn('text-sm', isLast ? 'text-ink font-medium' : 'text-ink-secondary')}
                >
                  {crumb.label}
                </span>
              ) : (
                <a
                  className="text-ink-secondary hover:text-ink focus-visible:focus-ring rounded-sm text-sm"
                  href={crumb.href}
                >
                  {crumb.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
