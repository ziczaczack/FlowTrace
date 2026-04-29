"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryTotal } from "@/types/database";

type Props = { data: CategoryTotal[] };

const formatMYR = (n: number) =>
  n.toLocaleString("en-MY", { style: "currency", currency: "MYR" });

type TooltipPayloadItem = { payload?: CategoryTotal };

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
      <p className="mb-0.5 text-foreground">
        <span aria-hidden>{item.icon}</span> {item.name}
      </p>
      <p className="text-muted-foreground">
        {formatMYR(item.total)} · {item.percentage.toFixed(1)}%
      </p>
    </div>
  );
}

export function CategoryDonutChart({ data }: Props) {
  const total = data.reduce((acc, d) => acc + d.total, 0);

  if (data.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-5 sm:p-6">
        <h3 className="mb-3 text-sm font-medium text-foreground">
          By category
        </h3>
        <p className="py-8 text-center text-sm text-muted-foreground">
          No expenses recorded this month yet.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">By category</h3>
        <span className="text-[11px] uppercase tracking-wide text-subtle-foreground">
          This month
        </span>
      </div>

      <div className="relative h-[260px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={2}
              stroke="var(--surface)"
              strokeWidth={2}
            >
              {data.map((entry) => (
                <Cell key={entry.categoryId} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[11px] uppercase tracking-wide text-subtle-foreground">
            Total
          </p>
          <p className="mt-0.5 text-xl font-semibold text-foreground tabular-nums">
            {formatMYR(total)}
          </p>
        </div>
      </div>

      {/* Custom legend */}
      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.map((c) => (
          <div
            key={c.categoryId}
            className="flex items-center justify-between rounded-xl border border-border bg-surface-muted/60 px-3 py-2 text-xs"
          >
            <span className="flex items-center gap-2 text-foreground">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: c.color }}
              />
              <span className="truncate">{c.name}</span>
            </span>
            <span className="text-muted-foreground tabular-nums">
              {formatMYR(c.total)} · {c.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
