"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyFlow } from "@/types/database";

type Props = { data: MonthlyFlow[] };

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

type TooltipPayloadItem = { value?: number; dataKey?: string };

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
  const get = (k: string) =>
    Number(payload.find((p) => p.dataKey === k)?.value ?? 0);
  return (
    <div className="glass-card-strong rounded-xl px-3 py-2 text-xs">
      <p className="mb-1 text-muted-foreground">{label}</p>
      <p className="text-positive tabular-nums">
        Income: {formatMYR(get("income"))}
      </p>
      <p className="text-negative tabular-nums">
        Expense: {formatMYR(get("expense"))}
      </p>
      <p className="text-foreground tabular-nums">Net: {formatMYR(get("net"))}</p>
    </div>
  );
}

export function AnnualFlowChart({ data }: Props) {
  const chartData = data.map((d) => ({
    label: MONTHS_SHORT[d.month - 1],
    income: d.income,
    expense: d.expense,
    net: d.income - d.expense,
  }));

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">12-month overview</h3>
        <span className="text-[11px] uppercase tracking-wide text-subtle-foreground">
          Income · Expense · Net
        </span>
      </div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
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
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground">
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
      </div>
    </div>
  );
}
