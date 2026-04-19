"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
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
  `RM ${n.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;

type TooltipPayloadItem = {
  name?: string;
  value?: number;
  dataKey?: string;
};

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
  return (
    <div className="glass-card-strong rounded-xl px-3 py-2 text-xs">
      <p className="mb-1 text-muted-foreground">{label}</p>
      {payload.map((p) => (
        <p
          key={p.dataKey}
          className={p.dataKey === "income" ? "text-positive" : "text-negative"}
        >
          {p.dataKey === "income" ? "Income" : "Expenses"}:{" "}
          {formatMYR(Number(p.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

export function NetFlowChart({ data }: Props) {
  const chartData = data.map((d) => ({
    label: MONTHS_SHORT[d.month - 1],
    income: d.income,
    expense: d.expense,
  }));

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Cash flow</h3>
        <span className="text-[11px] uppercase tracking-wide text-subtle-foreground">
          Last 6 months
        </span>
      </div>
      <div className="h-[240px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--border)"
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatMYR(v)}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "var(--border-strong)" }}
            />
            <Line
              type="monotone"
              dataKey="income"
              stroke="var(--positive)"
              strokeWidth={2.4}
              dot={false}
              activeDot={{
                r: 5,
                fill: "var(--positive)",
                stroke: "var(--surface)",
                strokeWidth: 2,
              }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              stroke="var(--negative)"
              strokeWidth={2.4}
              dot={false}
              activeDot={{
                r: 5,
                fill: "var(--negative)",
                stroke: "var(--surface)",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-positive" />
          Income
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-negative" />
          Expenses
        </span>
      </div>
    </div>
  );
}
