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
    <div className="rounded-lg border border-white/10 bg-[#162032] px-3 py-2 text-xs shadow-lg">
      <p className="mb-0.5 text-white">
        <span aria-hidden>{item.icon}</span> {item.name}
      </p>
      <p className="text-white/70">
        {formatMYR(item.total)} · {item.percentage.toFixed(1)}%
      </p>
    </div>
  );
}

export function CategoryDonutChart({ data }: Props) {
  const total = data.reduce((acc, d) => acc + d.total, 0);

  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-[#0F2044] p-5">
        <h3 className="mb-3 text-sm font-medium text-white/70">
          This month · by category
        </h3>
        <p className="py-8 text-center text-sm text-white/50">
          No expenses recorded this month yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0F2044] p-5">
      <h3 className="mb-3 text-sm font-medium text-white/70">
        This month · by category
      </h3>

      <div className="relative h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              stroke="none"
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
          <p className="text-xs uppercase tracking-wide text-white/50">Total</p>
          <p className="text-xl font-semibold text-white">{formatMYR(total)}</p>
        </div>
      </div>

      {/* Custom legend */}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {data.map((c) => (
          <div
            key={c.categoryId}
            className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-xs"
          >
            <span className="flex items-center gap-2 text-white/80">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: c.color }}
              />
              <span>{c.name}</span>
            </span>
            <span className="text-white/60">
              {formatMYR(c.total)} · {c.percentage.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
