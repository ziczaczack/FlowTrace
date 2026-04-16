"use client";

import { useMemo, useState } from "react";

type DailyPoint = { date: string; amount: number };

type Props = {
  /** Oldest → newest. 91 days is the recommended window (13 weeks). */
  data: DailyPoint[];
};

const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const formatMYR = (n: number) =>
  n.toLocaleString("en-MY", { style: "currency", currency: "MYR" });

function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatLabel(iso: string): string {
  const d = parseIso(iso);
  return d.toLocaleDateString("en-MY", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/**
 * Convert an amount into a bucket 0–4. Buckets use quartile thresholds of
 * the *non-zero* values, so a handful of big days don't wash out the rest.
 */
function buildBuckets(data: DailyPoint[]): Map<string, number> {
  const out = new Map<string, number>();
  const nonZero = data
    .map((d) => d.amount)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  if (nonZero.length === 0) {
    for (const d of data) out.set(d.date, 0);
    return out;
  }
  const q = (p: number) =>
    nonZero[Math.min(nonZero.length - 1, Math.floor(nonZero.length * p))];
  const t1 = q(0.25);
  const t2 = q(0.5);
  const t3 = q(0.75);
  for (const d of data) {
    if (d.amount <= 0) out.set(d.date, 0);
    else if (d.amount < t1) out.set(d.date, 1);
    else if (d.amount < t2) out.set(d.date, 2);
    else if (d.amount < t3) out.set(d.date, 3);
    else out.set(d.date, 4);
  }
  return out;
}

const BUCKET_CLASS = [
  "bg-surface-muted",
  "bg-[color-mix(in_oklab,var(--negative)_18%,var(--surface-muted))]",
  "bg-[color-mix(in_oklab,var(--negative)_38%,var(--surface-muted))]",
  "bg-[color-mix(in_oklab,var(--negative)_62%,var(--surface-muted))]",
  "bg-[color-mix(in_oklab,var(--negative)_88%,var(--surface-muted))]",
];

export function SpendingHeatmap({ data }: Props) {
  const [hovered, setHovered] = useState<DailyPoint | null>(null);
  const buckets = useMemo(() => buildBuckets(data), [data]);
  const byDate = useMemo(
    () => new Map(data.map((d) => [d.date, d.amount])),
    [data],
  );

  // Build the grid: columns = weeks, rows = day-of-week (Mon..Sun).
  // Align the first column so the earliest date sits in its correct row.
  const { columns, monthColumnLabels, total, activeDays } = useMemo(() => {
    if (data.length === 0) {
      return {
        columns: [] as string[][],
        monthColumnLabels: [] as (string | null)[],
        total: 0,
        activeDays: 0,
      };
    }
    const first = parseIso(data[0].date);
    // JS: Sunday = 0. We want Monday = 0.
    const offset = (first.getDay() + 6) % 7;
    // Build a continuous date list from the aligned start to today.
    const aligned: string[] = [];
    for (let i = 0; i < offset; i++) aligned.push("");
    for (const d of data) aligned.push(d.date);

    const cols: string[][] = [];
    for (let i = 0; i < aligned.length; i += 7) {
      cols.push(aligned.slice(i, i + 7));
    }

    // Month labels per column (only when the month changes).
    const labels: (string | null)[] = cols.map((col, idx) => {
      const firstNonEmpty = col.find((c) => c);
      if (!firstNonEmpty) return null;
      const m = parseIso(firstNonEmpty).getMonth();
      if (idx === 0) return MONTH_LABELS[m];
      const prevCol = cols[idx - 1];
      const prevLabel = prevCol.find((c) => c);
      if (!prevLabel) return MONTH_LABELS[m];
      return parseIso(prevLabel).getMonth() !== m ? MONTH_LABELS[m] : null;
    });

    let sum = 0;
    let active = 0;
    for (const d of data) {
      sum += d.amount;
      if (d.amount > 0) active++;
    }

    return {
      columns: cols,
      monthColumnLabels: labels,
      total: sum,
      activeDays: active,
    };
  }, [data]);

  return (
    <section className="glass-card rounded-2xl p-5 sm:p-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-subtle-foreground">
            Spending rhythm
          </h2>
          <p className="mt-1 text-lg font-semibold text-foreground">
            Last {data.length} days
          </p>
        </div>
        <div className="flex items-baseline gap-4 text-right">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-subtle-foreground">
              Total
            </p>
            <p className="text-sm font-semibold text-foreground tabular-nums">
              {formatMYR(total)}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-subtle-foreground">
              Active
            </p>
            <p className="text-sm font-semibold text-foreground tabular-nums">
              {activeDays}d
            </p>
          </div>
        </div>
      </header>

      <div className="relative">
        {/* Hover readout */}
        <div className="mb-3 h-5 text-xs text-muted-foreground">
          {hovered ? (
            <span className="tabular-nums">
              <span className="font-medium text-foreground">
                {formatLabel(hovered.date)}
              </span>{" "}
              ·{" "}
              {hovered.amount > 0 ? (
                <span className="text-negative">
                  {formatMYR(hovered.amount)}
                </span>
              ) : (
                <span className="text-subtle-foreground">no spending</span>
              )}
            </span>
          ) : (
            <span className="text-subtle-foreground">
              Hover a day for details
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <div className="flex min-w-max items-start gap-1.5">
            {/* Day-of-week labels */}
            <div className="mr-1 flex flex-col gap-[3px] pt-5">
              {DAY_LABELS.map((label, i) => (
                <span
                  key={i}
                  className="flex h-[14px] w-6 items-center text-[10px] leading-none text-subtle-foreground"
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Grid */}
            <div className="flex flex-col gap-1">
              {/* Month row */}
              <div className="flex h-4 gap-[3px]">
                {columns.map((_, idx) => (
                  <span
                    key={idx}
                    className="w-[14px] text-[10px] font-medium text-subtle-foreground"
                  >
                    {monthColumnLabels[idx] ?? ""}
                  </span>
                ))}
              </div>
              {/* Cells */}
              <div className="flex gap-[3px]">
                {columns.map((col, cIdx) => (
                  <div key={cIdx} className="flex flex-col gap-[3px]">
                    {Array.from({ length: 7 }).map((_, rIdx) => {
                      const date = col[rIdx] ?? "";
                      if (!date) {
                        return (
                          <span
                            key={rIdx}
                            className="h-[14px] w-[14px]"
                            aria-hidden
                          />
                        );
                      }
                      const bucket = buckets.get(date) ?? 0;
                      const amount = byDate.get(date) ?? 0;
                      const isToday = date === isoDate(new Date());
                      return (
                        <button
                          key={rIdx}
                          type="button"
                          onMouseEnter={() => setHovered({ date, amount })}
                          onFocus={() => setHovered({ date, amount })}
                          onMouseLeave={() => setHovered(null)}
                          onBlur={() => setHovered(null)}
                          aria-label={`${formatLabel(date)}: ${amount > 0 ? formatMYR(amount) : "no spending"}`}
                          className={[
                            "h-[14px] w-[14px] rounded-[3px] transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]",
                            BUCKET_CLASS[bucket],
                            isToday ? "ring-1 ring-primary" : "",
                          ].join(" ")}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 text-[11px] text-subtle-foreground">
          <span>Less</span>
          {BUCKET_CLASS.map((cls, i) => (
            <span
              key={i}
              className={`h-3 w-3 rounded-[3px] ${cls}`}
              aria-hidden
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </section>
  );
}
