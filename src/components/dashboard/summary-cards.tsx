"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

type Props = {
  totalBalance: number;
  income: number;
  expense: number;
  net: number;
};

const formatMYR = (n: number) =>
  n.toLocaleString("en-MY", { style: "currency", currency: "MYR" });

/** Animate a number from 0 → target using requestAnimationFrame. */
function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const from = 0;
    const to = target;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = ts - start;
      const t = Math.min(1, elapsed / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(from + (to - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

export function SummaryCards({ totalBalance, income, expense }: Props) {
  const balanceVal = useCountUp(totalBalance);
  const incomeVal = useCountUp(income);
  const expenseVal = useCountUp(expense);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="glass-card group relative overflow-hidden rounded-2xl p-5 transition-shadow duration-200 hover:shadow-[var(--shadow-elevated)]">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        />
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle-foreground">
          Total balance
        </p>
        <p className="mt-2.5 text-[26px] font-semibold tracking-tight text-foreground tabular-nums">
          {formatMYR(balanceVal)}
        </p>
      </div>

      <div className="glass-card relative overflow-hidden rounded-2xl p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle-foreground">
          Income · this month
        </p>
        <p className="mt-2.5 flex items-center gap-1.5 text-[26px] font-semibold tracking-tight text-positive tabular-nums">
          <ArrowUpRight className="h-5 w-5" aria-hidden />
          {formatMYR(incomeVal)}
        </p>
      </div>

      <div className="glass-card relative overflow-hidden rounded-2xl p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle-foreground">
          Expenses · this month
        </p>
        <p className="mt-2.5 flex items-center gap-1.5 text-[26px] font-semibold tracking-tight text-negative tabular-nums">
          <ArrowDownRight className="h-5 w-5" aria-hidden />
          {formatMYR(expenseVal)}
        </p>
      </div>
    </div>
  );
}
