import { useState } from 'react';
import { formatMoney } from '@/utils/format';
import type { RevenuePoint } from '@/types';

interface RevenueChartProps {
  data: RevenuePoint[];
  currency?: string;
}

const CHART_HEIGHT = 168;
const BAR_RADIUS = 4;
const BAR_GAP = 2;

const shortDate = (iso: string): string =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso}T00:00:00Z`),
  );

/**
 * Single-series daily revenue.
 *
 * One measure, one hue — so there is no legend (the heading names the series)
 * and no categorical palette to validate. Only the peak bar is labelled
 * directly; the rest are available on hover and in the table below, which
 * keeps the chart readable instead of pebbled with numbers.
 */
export const RevenueChart = ({ data, currency = 'usd' }: RevenueChartProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const maxRevenue = Math.max(...data.map((point) => point.revenueCents), 0);
  const peakIndex = data.findIndex((point) => point.revenueCents === maxRevenue && maxRevenue > 0);
  const totalRevenue = data.reduce((sum, point) => sum + point.revenueCents, 0);

  if (data.length === 0 || maxRevenue === 0) {
    return (
      <div className="flex h-[168px] items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">
        No paid orders in this period yet.
      </div>
    );
  }

  const barWidth = 100 / data.length;
  const active = activeIndex !== null ? data[activeIndex] : null;

  return (
    <figure className="m-0">
      <div className="relative">
        {/* Recessive baseline; no heavy grid competing with the data. */}
        <div
          className="absolute inset-x-0 bottom-0 border-t border-border"
          aria-hidden="true"
          style={{ top: CHART_HEIGHT }}
        />

        <svg
          viewBox={`0 0 100 ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          className="w-full"
          style={{ height: CHART_HEIGHT }}
          role="img"
          aria-label={`Daily revenue over the last ${data.length} days, totalling ${formatMoney(totalRevenue, currency)}. Peak day ${peakIndex >= 0 ? shortDate(data[peakIndex]!.date) : 'none'}.`}
        >
          {data.map((point, index) => {
            // Zero-revenue days still get a 2px stub so the day is visible
            // as "nothing sold" rather than silently missing.
            const height =
              point.revenueCents === 0
                ? 2
                : Math.max((point.revenueCents / maxRevenue) * (CHART_HEIGHT - 8), 4);

            const isActive = activeIndex === index;

            return (
              <rect
                key={point.date}
                x={index * barWidth + BAR_GAP / 2}
                y={CHART_HEIGHT - height}
                width={barWidth - BAR_GAP}
                height={height}
                rx={BAR_RADIUS}
                className={
                  point.revenueCents === 0
                    ? 'fill-border'
                    : isActive
                      ? 'fill-primary'
                      : 'fill-primary/75'
                }
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                tabIndex={0}
                role="graphics-symbol"
                aria-label={`${shortDate(point.date)}: ${formatMoney(point.revenueCents, currency)} from ${point.orders} order${point.orders === 1 ? '' : 's'}`}
              />
            );
          })}
        </svg>

        {/* Tooltip. Text uses ink tokens, never the series colour. */}
        {active ? (
          <div
            className="pointer-events-none absolute -top-2 left-1/2 w-max -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-lift"
            role="status"
          >
            <p className="font-medium text-foreground">{shortDate(active.date)}</p>
            <p className="tabular mt-0.5 text-muted-foreground">
              {formatMoney(active.revenueCents, currency)} · {active.orders} order
              {active.orders === 1 ? '' : 's'}
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>{shortDate(data[0]!.date)}</span>
        {peakIndex >= 0 ? (
          <span className="tabular font-medium text-foreground">
            Peak {formatMoney(maxRevenue, currency)}
          </span>
        ) : null}
        <span>{shortDate(data[data.length - 1]!.date)}</span>
      </div>

      {/* Table view: the same data, readable without seeing the chart. */}
      <figcaption className="sr-only">
        <table>
          <caption>Daily revenue</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Revenue</th>
              <th scope="col">Orders</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.date}>
                <th scope="row">{shortDate(point.date)}</th>
                <td>{formatMoney(point.revenueCents, currency)}</td>
                <td>{point.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
};
