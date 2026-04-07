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
    <div className="rounded-lg border border-white/10 bg-[#162032] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 text-white/70">{label}</p>
      {payload.map((p) => (
        <p
          key={p.dataKey}
          className={
            p.dataKey === "income" ? "text-[#10B981]" : "text-[#F43F5E]"
          }
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
    <div className="rounded-2xl border border-white/10 bg-[#0F2044] p-5">
      <h3 className="mb-3 text-sm font-medium text-white/70">
        Cash flow · last 6 months
      </h3>
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(255,255,255,0.1)"
            />
            <XAxis
              dataKey="label"
              tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatMYR(v)}
              tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
            <Line
              type="monotone"
              dataKey="income"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: "#10B981", stroke: "#0F2044", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              stroke="#F43F5E"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: "#F43F5E", stroke: "#0F2044", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Custom legend */}
      <div className="mt-3 flex items-center justify-center gap-6 text-xs text-white/70">
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: "#10B981" }}
          />
          Income
        </span>
        <span className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: "#F43F5E" }}
          />
          Expenses
        </span>
      </div>
    </div>
  );
}
