"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, TrendingUp, TrendingDown } from "lucide-react";
import { useT, useLocale, formatMoney } from "@/lib/i18n";

type Props = {
  totalBalance: number;
  income: number;
  expense: number;
  net: number;
};

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

export function SummaryCards({ totalBalance, income, expense, net }: Props) {
  const t = useT();
  const locale = useLocale();
  const formatMYR = (n: number) => formatMoney(n, locale);
  const balanceVal = useCountUp(totalBalance);
  const incomeVal = useCountUp(income);
  const expenseVal = useCountUp(expense);
  const netVal = useCountUp(Math.abs(net));

  const savingsRate =
    income > 0 ? Math.round(((income - expense) / income) * 100) : null;
  const isPositiveNet = net >= 0;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {/* Total Balance */}
      <div className="glass-card group relative overflow-hidden rounded-2xl p-5 transition-shadow duration-200 hover:shadow-[var(--shadow-elevated)] col-span-2 sm:col-span-1">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent"
        />
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle-foreground">
          {t("dashboard.totalBalance")}
        </p>
        <p className="amount-sensitive mt-2.5 text-[26px] font-semibold tracking-tight text-foreground tabular-nums">
          {formatMYR(balanceVal)}
        </p>
      </div>

      {/* Income */}
      <div className="glass-card relative overflow-hidden rounded-2xl p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle-foreground">
          {t("dashboard.incomeThisMonth")}
        </p>
        <p className="amount-sensitive mt-2.5 flex items-center gap-1.5 text-[22px] font-semibold tracking-tight text-positive tabular-nums">
          <ArrowUpRight className="h-5 w-5 shrink-0" aria-hidden />
          {formatMYR(incomeVal)}
        </p>
      </div>

      {/* Expenses */}
      <div className="glass-card relative overflow-hidden rounded-2xl p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle-foreground">
          {t("dashboard.expensesThisMonth")}
        </p>
        <p className="amount-sensitive mt-2.5 flex items-center gap-1.5 text-[22px] font-semibold tracking-tight text-negative tabular-nums">
          <ArrowDownRight className="h-5 w-5 shrink-0" aria-hidden />
          {formatMYR(expenseVal)}
        </p>
      </div>

      {/* Net / Savings Rate */}
      <div className="glass-card relative overflow-hidden rounded-2xl p-5">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-subtle-foreground">
          {t("dashboard.netThisMonth")}
        </p>
        <p
          className={`amount-sensitive mt-2.5 flex items-center gap-1.5 text-[22px] font-semibold tracking-tight tabular-nums ${
            isPositiveNet ? "text-positive" : "text-negative"
          }`}
        >
          {isPositiveNet ? (
            <TrendingUp className="h-5 w-5 shrink-0" aria-hidden />
          ) : (
            <TrendingDown className="h-5 w-5 shrink-0" aria-hidden />
          )}
          {isPositiveNet ? "+" : "−"}
          {formatMYR(netVal)}
        </p>
        {savingsRate !== null && (
          <p
            className={`mt-1 text-[11px] font-medium ${
              savingsRate >= 20
                ? "text-positive"
                : savingsRate >= 0
                  ? "text-muted-foreground"
                  : "text-negative"
            }`}
          >
            {t("dashboard.savingsRate", { pct: savingsRate })}
          </p>
        )}
      </div>
    </div>
  );
}
