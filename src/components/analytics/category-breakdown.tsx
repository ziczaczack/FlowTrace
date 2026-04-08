"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MonthSelector } from "@/components/timeline/month-selector";
import type { CategoryTotal } from "@/types/database";

type Props = {
  initialData: CategoryTotal[];
  initialMonth: number;
  initialYear: number;
  accountCreatedAt?: string | null;
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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
    <div className="glass-card-strong rounded-lg px-3 py-2 text-xs">
      <p className="font-medium text-foreground">
        <span aria-hidden>{item.icon}</span> {item.name}
      </p>
      <p className="text-muted-foreground tabular-nums">
        {formatMYR(item.total)} · {item.percentage.toFixed(1)}%
      </p>
    </div>
  );
}

export function CategoryBreakdown({
  initialData,
  initialMonth,
  initialYear,
  accountCreatedAt,
}: Props) {
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  // Cache fetched results keyed by "year-month" so navigating back to a
  // previously viewed month is instant and we never have to clobber state
  // synchronously inside an effect.
  const [cache, setCache] = useState<Record<string, CategoryTotal[]>>(() => ({
    [`${initialYear}-${initialMonth}`]: initialData,
  }));

  const key = `${year}-${month}`;
  const cached = cache[key];
  const data: CategoryTotal[] = cached ?? [];
  const loading = cached === undefined;

  useEffect(() => {
    if (cache[key]) return;
    let cancelled = false;
    fetch(`/api/categories/breakdown?month=${month}&year=${year}`)
      .then((r) => r.json())
      .then((res: { data: CategoryTotal[] | null }) => {
        if (cancelled) return;
        setCache((prev) => ({ ...prev, [key]: res.data ?? [] }));
      });
    return () => {
      cancelled = true;
    };
  }, [key, month, year, cache]);

  const total = data.reduce((acc, c) => acc + c.total, 0);
  const height = Math.max(data.length * 48 + 60, 180);

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
          Spending breakdown · {MONTH_NAMES[month - 1]} {year}
        </h3>
        <MonthSelector
          month={month}
          year={year}
          onChange={(m, y) => {
            setMonth(m);
            setYear(y);
          }}
          accountCreatedAt={accountCreatedAt}
        />
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-subtle-foreground">
          Loading...
        </p>
      ) : data.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No expenses recorded for this month
        </p>
      ) : (
        <>
          <div style={{ height }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 0, right: 80, left: 0, bottom: 0 }}
                barSize={32}
              >
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={140}
                  tickFormatter={(value: string) => {
                    const item = data.find((d) => d.name === value);
                    return item ? `${item.icon} ${item.name}` : value;
                  }}
                />
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "color-mix(in oklab, var(--foreground) 6%, transparent)" }}
                />
                <Bar
                  dataKey="total"
                  radius={[0, 4, 4, 0]}
                  label={{
                    position: "right",
                    formatter: (value: React.ReactNode) => {
                      const num = Number(value);
                      if (!Number.isFinite(num)) return "";
                      const pct =
                        total > 0 ? ((num / total) * 100).toFixed(0) : "0";
                      return `${formatMYR(num)} · ${pct}%`;
                    },
                    fill: "var(--muted-foreground)",
                    fontSize: 11,
                  }}
                >
                  {data.map((d) => (
                    <Cell key={d.categoryId} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-3 text-right text-xs font-medium text-muted-foreground tabular-nums">
            Total: {formatMYR(total)}
          </p>
        </>
      )}
    </div>
  );
}
