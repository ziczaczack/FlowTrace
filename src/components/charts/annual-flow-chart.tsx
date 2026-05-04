"use client";

import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyFlow } from "@/types/database";
import type { ForecastPoint } from "@/lib/forecast";

type Props = {
  data: MonthlyFlow[];
  forecast?: ForecastPoint[];
};

const MONTHS_SHORT = [
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

const formatCompact = (n: number) => {
  if (Math.abs(n) >= 1000) return `RM ${(n / 1000).toFixed(1)}k`;
  return `RM ${n.toFixed(0)}`;
};

type Row = {
  label: string;
  isForecast: boolean;
  income: number | null;
  expense: number | null;
  net: number | null;
  forecastMid: number | null;
  forecastBand: [number, number] | null;
};

type TooltipPayloadItem = { value?: number | number[]; dataKey?: string };

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const findRaw = (k: string) => payload.find((p) => p.dataKey === k)?.value;
  const num = (v: number | number[] | undefined) =>
    typeof v === "number" ? v : 0;

  const isForecastRow = payload.some(
    (p) => p.dataKey === "forecastMid" && typeof p.value === "number",
  );

  if (isForecastRow) {
    const mid = num(findRaw("forecastMid"));
    const band = findRaw("forecastBand");
    const [lo, hi] = Array.isArray(band) ? band : [mid, mid];
    return (
      <div className="glass-card-strong rounded-xl px-3 py-2 text-xs">
        <p className="mb-1 text-muted-foreground">
          {label}{" "}
          <span className="text-[10px] uppercase tracking-wide text-subtle-foreground">
            · forecast
          </span>
        </p>
        <p className="text-foreground tabular-nums">
          Net (proj.): {formatMYR(mid)}
        </p>
        <p className="text-muted-foreground tabular-nums">
          Likely range: {formatMYR(lo)} → {formatMYR(hi)}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card-strong rounded-xl px-3 py-2 text-xs">
      <p className="mb-1 text-muted-foreground">{label}</p>
      <p className="text-positive tabular-nums">
        Income: {formatMYR(num(findRaw("income")))}
      </p>
      <p className="text-negative tabular-nums">
        Expense: {formatMYR(num(findRaw("expense")))}
      </p>
      <p className="text-foreground tabular-nums">
        Net: {formatMYR(num(findRaw("net")))}
      </p>
    </div>
  );
}

export function AnnualFlowChart({ data, forecast }: Props) {
  const historical: Row[] = data.map((d) => ({
    label: MONTHS_SHORT[d.month - 1],
    isForecast: false,
    income: d.income,
    expense: d.expense,
    net: d.income - d.expense,
    forecastMid: null,
    forecastBand: null,
  }));

  const hasForecast = (forecast?.length ?? 0) > 0 && historical.length > 0;
  const chartData: Row[] = [...historical];

  if (hasForecast) {
    // Anchor the forecast line + band to the last historical net so the
    // dashed projection visually continues from the solid line.
    const last = historical[historical.length - 1];
    const lastNet = last.net ?? 0;
    last.forecastMid = lastNet;
    last.forecastBand = [lastNet, lastNet];

    for (const f of forecast!) {
      chartData.push({
        label: MONTHS_SHORT[f.month - 1],
        isForecast: true,
        income: null,
        expense: null,
        net: null,
        forecastMid: f.mid,
        forecastBand: [f.lower, f.upper],
      });
    }
  }

  // Index of the boundary tick — the last historical month — used to draw a
  // subtle vertical guide between "actual" and "projected".
  const boundaryLabel = hasForecast
    ? historical[historical.length - 1].label
    : null;

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">12-month overview</h3>
        <span className="text-[11px] uppercase tracking-wide text-subtle-foreground">
          {hasForecast ? "Income · Expense · Net + projection" : "Income · Expense · Net"}
        </span>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatCompact(v)}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "var(--surface-muted)", opacity: 0.5 }}
            />

            {hasForecast && (
              <Area
                dataKey="forecastBand"
                stroke="none"
                fill="var(--foreground)"
                fillOpacity={0.08}
                isAnimationActive={false}
                activeDot={false}
                legendType="none"
              />
            )}

            <Bar
              dataKey="income"
              fill="var(--positive)"
              fillOpacity={0.55}
              radius={[5, 5, 0, 0]}
            />
            <Bar
              dataKey="expense"
              fill="var(--negative)"
              fillOpacity={0.55}
              radius={[5, 5, 0, 0]}
            />

            <Line
              type="monotone"
              dataKey="net"
              stroke="var(--foreground)"
              strokeWidth={2}
              dot={{
                r: 3,
                fill: "var(--foreground)",
                stroke: "var(--surface)",
                strokeWidth: 1,
              }}
              connectNulls={false}
            />

            {hasForecast && (
              <Line
                type="monotone"
                dataKey="forecastMid"
                stroke="var(--foreground)"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{
                  r: 3,
                  fill: "var(--surface)",
                  stroke: "var(--foreground)",
                  strokeWidth: 1.5,
                }}
                isAnimationActive={false}
                connectNulls={false}
              />
            )}

            {boundaryLabel && (
              <ReferenceLine
                x={boundaryLabel}
                stroke="var(--border)"
                strokeDasharray="2 4"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-positive/60" />
          Income
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-negative/60" />
          Expense
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-3 bg-foreground" />
          Net
        </span>
        {hasForecast && (
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-0.5 w-3 bg-foreground"
              style={{
                background:
                  "repeating-linear-gradient(to right, var(--foreground) 0 4px, transparent 4px 8px)",
              }}
            />
            Projection · 80% range
          </span>
        )}
      </div>
    </div>
  );
}
