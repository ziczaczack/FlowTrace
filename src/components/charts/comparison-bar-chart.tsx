"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategoryTotal } from "@/types/database";

type Props = {
  data: {
    categories: string[];
    current: CategoryTotal[];
    previous: CategoryTotal[];
  };
};

const formatMYR = (n: number) =>
  `RM ${n.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;

const truncate = (s: string, max = 8) =>
  s.length > max ? `${s.slice(0, max - 1)}…` : s;

type TooltipPayloadItem = {
  value?: number;
  dataKey?: string;
  payload?: { name: string; current: number; previous: number };
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload;
  if (!item) return null;
  return (
    <div className="glass-card-strong rounded-xl px-3 py-2 text-xs">
      <p className="mb-1 text-foreground">{item.name}</p>
      <p className="text-foreground tabular-nums">
        This month: {formatMYR(item.current)}
      </p>
      <p className="text-muted-foreground tabular-nums">
        Last month: {formatMYR(item.previous)}
      </p>
    </div>
  );
}

export function ComparisonBarChart({ data }: Props) {
  const chartData = data.current.map((c, i) => ({
    name: c.name,
    label: truncate(c.name),
    current: c.total,
    previous: data.previous[i]?.total ?? 0,
    color: c.color,
  }));

  const isEmpty = chartData.every((d) => d.current === 0 && d.previous === 0);

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          This month vs last
        </h3>
        <span className="text-[11px] uppercase tracking-wide text-subtle-foreground">
          By category
        </span>
      </div>

      {isEmpty || chartData.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No expenses this month yet
        </p>
      ) : (
        <>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                barCategoryGap="22%"
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
                  tickFormatter={(v: number) => formatMYR(v)}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "var(--surface-muted)", opacity: 0.5 }}
                />
                <Bar dataKey="current" radius={[6, 6, 0, 0]}>
                  {chartData.map((d) => (
                    <Cell key={`c-${d.name}`} fill={d.color} />
                  ))}
                </Bar>
                <Bar dataKey="previous" radius={[6, 6, 0, 0]}>
                  {chartData.map((d) => (
                    <Cell
                      key={`p-${d.name}`}
                      fill={d.color}
                      fillOpacity={0.32}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-foreground/80" />
              This month
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-foreground/30" />
              Last month
            </span>
          </div>
        </>
      )}
    </div>
  );
}
