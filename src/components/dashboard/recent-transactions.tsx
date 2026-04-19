import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Transaction } from "@/types/database";

type Props = {
  transactions: Transaction[];
};

function formatMYR(n: number) {
  return n.toLocaleString("en-MY", { style: "currency", currency: "MYR" });
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const now = new Date();
  const today = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
  if (y === today.y && m === today.m && d === today.d) return "Today";
  const yest = new Date(now); yest.setDate(yest.getDate() - 1);
  if (y === yest.getFullYear() && m === yest.getMonth() + 1 && d === yest.getDate())
    return "Yesterday";
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
  });
}

export function RecentTransactions({ transactions }: Props) {
  const recent = transactions.slice(0, 7);

  if (recent.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
          Recent transactions
        </h3>
        <Link
          href="/timeline"
          className="flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-70"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex flex-col gap-0.5">
        {recent.map((t) => {
          const amount = parseFloat(t.amount);
          const isIncome = t.type === "income";
          const isTransfer = t.type === "transfer";
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-muted"
            >
              {/* Category icon */}
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
                style={{
                  background: t.category?.color
                    ? `${t.category.color}22`
                    : "var(--surface-muted)",
                }}
              >
                {t.category?.icon ?? "💸"}
              </div>

              {/* Name + date */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {t.category?.name ?? (isTransfer ? "Transfer" : "Unknown")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDate(t.txn_date)}
                  {t.note && (
                    <span className="ml-1.5 text-subtle-foreground">
                      · {t.note}
                    </span>
                  )}
                </p>
              </div>

              {/* Amount */}
              <p
                className={`amount-sensitive shrink-0 text-sm font-semibold tabular-nums ${
                  isTransfer
                    ? "text-muted-foreground"
                    : isIncome
                      ? "text-positive"
                      : "text-negative"
                }`}
              >
                {isTransfer ? "" : isIncome ? "+" : "−"}
                {formatMYR(Math.abs(amount))}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
