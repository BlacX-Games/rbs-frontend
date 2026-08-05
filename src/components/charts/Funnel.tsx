import { ChartFrame, type ChartFrameProps } from '@/components/charts/ChartFrame';
import { formatNumber } from '@/components/charts/chart';
import { cn } from '@/lib/cn';

/**
 * Ordered drop-off — the tier-progression funnel from §6.4.
 *
 * Built from HTML, not SVG, and that is the point: a funnel is a list of stages
 * with a bar and two numbers each, so the honest structure is an ordered list.
 * As HTML the labels wrap at +30% text expansion, the numbers inherit
 * `tabular`, and every stage is real text rather than `<text>` a translator
 * cannot reach.
 *
 * The stages are ORDERED, so this uses the ordinal tier ramp — one hue, monotone
 * lightness — rather than categorical hues. Eight identity colours on stages
 * that have a natural sequence would throw away the ordering the reader needs.
 */
const TIER_RAMP = [
  'var(--tier-beloved)',
  'var(--tier-popular)',
  'var(--tier-known)',
  'var(--tier-new)',
] as const;

export function Funnel({
  stages,
  formatValue = formatNumber,
  formatRate,
  ...frame
}: Omit<ChartFrameProps, 'children' | 'legendMark' | 'series'> & {
  readonly stages: readonly {
    readonly key: string;
    readonly label: string;
    readonly value: number;
  }[];
  /** Renders the retained share, e.g. `(r) => \`${Math.round(r * 100)}%\``. */
  readonly formatRate: (rate: number) => string;
}) {
  const first = stages.at(0)?.value ?? 0;

  return (
    <ChartFrame
      {...frame}
      formatValue={formatValue}
      legendMark="rect"
      series={[
        {
          key: 'funnel',
          label: frame.xLabel,
          slot: 4,
          points: stages.map((stage) => ({ x: stage.label, y: stage.value })),
        },
      ]}
    >
      {() => (
        <ol className="flex h-full flex-col justify-center gap-8">
          {stages.map((stage, index) => {
            const share = first === 0 ? 0 : stage.value / first;

            return (
              <li className="flex items-center gap-12" key={stage.key}>
                <span className="text-ink-secondary w-96 shrink-0 truncate text-sm">
                  {stage.label}
                </span>

                <span className="bg-raised border-hairline relative h-16 flex-1 overflow-hidden rounded-sm border">
                  <span
                    className={cn('block h-full rounded-sm')}
                    style={{
                      // The ramp is indexed by STAGE, not by rank, so filtering
                      // never repaints a stage the reader has already learned.
                      backgroundColor: TIER_RAMP[Math.min(index, TIER_RAMP.length - 1)],
                      width: `${String(Math.max(share * 100, 0))}%`,
                    }}
                  />
                </span>

                {/* Both numbers, always: the count and the share. A funnel that
                    shows only percentages hides how few the last stage is. */}
                <span className="text-ink tabular w-64 shrink-0 text-right text-sm font-medium">
                  {formatValue(stage.value)}
                </span>
                <span className="text-ink-secondary tabular w-48 shrink-0 text-right text-sm">
                  {formatRate(share)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </ChartFrame>
  );
}
