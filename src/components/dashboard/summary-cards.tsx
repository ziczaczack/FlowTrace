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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="rounded-2xl border border-white/10 bg-[#0F2044] p-5">
        <p className="text-xs uppercase tracking-wide text-white/50">
          Total balance
        </p>
        <p className="mt-2 text-2xl font-semibold text-white">
          {formatMYR(balanceVal)}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0F2044] p-5">
        <p className="text-xs uppercase tracking-wide text-white/50">Income</p>
        <p className="mt-2 flex items-center gap-1 text-2xl font-semibold text-[#10B981]">
          <ArrowUpRight className="h-5 w-5" aria-hidden />
          {formatMYR(incomeVal)}
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0F2044] p-5">
        <p className="text-xs uppercase tracking-wide text-white/50">Expenses</p>
        <p className="mt-2 flex items-center gap-1 text-2xl font-semibold text-[#F43F5E]">
          <ArrowDownRight className="h-5 w-5" aria-hidden />
          {formatMYR(expenseVal)}
        </p>
      </div>
    </div>
  );
}
