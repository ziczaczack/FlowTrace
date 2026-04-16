"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Target } from "lucide-react";
import type { CategoryBudgetItem } from "@/types/database";

type Props = {
  items: CategoryBudgetItem[];
};

const formatMYR = (n: number) =>
  n.toLocaleString("en-MY", { style: "currency", currency: "MYR" });

function ProgressBar({ percentage, color }: { percentage: number; color: string | null }) {
  const capped = Math.min(percentage, 100);
  const barColor =
    percentage > 100
      ? "var(--negative)"
      : percentage > 80
        ? "var(--warning)"
        : color ?? "var(--primary)";

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${capped}%`, background: barColor }}
      />
    </div>
  );
}

export function BudgetOverview({ items }: Props) {
  const withBudget = items.filter((i) => i.budgetLimit !== null);

  if (withBudget.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
            Budget overview
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Target className="mb-3 h-8 w-8 text-subtle-foreground" />
          <p className="text-sm font-medium text-foreground">
            No budgets set yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Set monthly limits in{" "}
            <Link href="/settings" className="text-primary hover:underline">
              Settings → Monthly Budgets
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const overBudget = withBudget.filter((i) => i.percentage > 100);
  const nearBudget = withBudget.filter(
    (i) => i.percentage > 80 && i.percentage <= 100,
  );
  const onTrack = withBudget.filter((i) => i.percentage <= 80);

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
          Budget overview · this month
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {overBudget.length > 0 && (
            <span className="flex items-center gap-1 text-negative">
              <AlertTriangle className="h-3.5 w-3.5" />
              {overBudget.length} over
            </span>
          )}
          {nearBudget.length > 0 && (
            <span className="flex items-center gap-1 text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              {nearBudget.length} near
            </span>
          )}
          {onTrack.length > 0 && (
            <span className="flex items-center gap-1 text-positive">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {onTrack.length} on track
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {withBudget.map((item) => {
          const remaining = (item.budgetLimit ?? 0) - item.currentSpend;
          const isOver = item.percentage > 100;
          const isNear = item.percentage > 80 && !isOver;

          return (
            <div
              key={item.categoryId}
              className={`rounded-xl border p-4 transition-colors ${
                isOver
                  ? "border-negative/30 bg-[var(--negative-soft)]"
                  : isNear
                    ? "border-warning/30 bg-[var(--warning-soft)]"
                    : "border-border bg-surface-muted/50"
              }`}
            >
              <div className="mb-2.5 flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-base" aria-hidden>
                    {item.categoryIcon ?? "📦"}
                  </span>
                  <span className="text-sm font-medium text-foreground">
                    {item.categoryName}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`text-xs font-semibold tabular-nums ${
                      isOver ? "text-negative" : isNear ? "text-warning" : "text-foreground"
                    }`}
                  >
                    {Math.round(item.percentage)}%
                  </p>
                </div>
              </div>

              <ProgressBar
                percentage={item.percentage}
                color={item.categoryColor}
              />

              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="tabular-nums">
                  {formatMYR(item.currentSpend)} spent
                </span>
                <span className="tabular-nums">
                  {isOver ? (
                    <span className="text-negative">
                      {formatMYR(Math.abs(remaining))} over
                    </span>
                  ) : (
                    <span>{formatMYR(remaining)} left</span>
                  )}
                </span>
              </div>

              <p className="mt-1 text-right text-[10px] text-subtle-foreground tabular-nums">
                Limit: {formatMYR(item.budgetLimit ?? 0)}
              </p>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-right text-[11px] text-subtle-foreground">
        <Link href="/settings" className="hover:text-primary hover:underline">
          Manage budgets →
        </Link>
      </p>
    </div>
  );
}
