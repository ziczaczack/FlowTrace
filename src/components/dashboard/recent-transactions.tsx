"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Transaction } from "@/types/database";
import {
  useT,
  useLocale,
  formatMoney,
  formatDate as fmtDate,
  translateCategoryName,
} from "@/lib/i18n";

type Props = {
  transactions: Transaction[];
};

export function RecentTransactions({ transactions }: Props) {
  const t = useT();
  const locale = useLocale();
  const formatMYR = (n: number) => formatMoney(n, locale);

  function formatDate(dateStr: string): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const now = new Date();
    const today = { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
    if (y === today.y && m === today.m && d === today.d) return t("common.today");
    const yest = new Date(now);
    yest.setDate(yest.getDate() - 1);
    if (
      y === yest.getFullYear() &&
      m === yest.getMonth() + 1 &&
      d === yest.getDate()
    )
      return t("common.yesterday");
    return fmtDate(new Date(Date.UTC(y, m - 1, d)), locale, {
      day: "numeric",
      month: "short",
    });
  }

  const recent = transactions.slice(0, 7);
  // Show ledger label only when transactions span more than one ledger —
  // single-ledger users would just see the same name on every row.
  const ledgerIds = new Set(recent.map((txn) => txn.ledger_id));
  const showLedgerHint = ledgerIds.size > 1;

  if (recent.length === 0) return null;

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
          {t("dashboard.recentTransactions")}
        </h3>
        <Link
          href="/timeline"
          className="flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-70"
        >
          {t("dashboard.viewAll")}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex flex-col gap-0.5">
        {recent.map((txn) => {
          const amount = parseFloat(txn.amount);
          const isIncome = txn.type === "income";
          const isTransfer = txn.type === "transfer";
          return (
            <div
              key={txn.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-muted"
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
                style={{
                  background: txn.category?.color
                    ? `${txn.category.color}22`
                    : "var(--surface-muted)",
                }}
              >
                {txn.category?.icon ?? "💸"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {txn.category?.name
                    ? translateCategoryName(txn.category.name, t)
                    : isTransfer
                      ? t("category.transfer")
                      : t("category.unknown")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDate(txn.txn_date)}
                  {showLedgerHint && txn.ledger && (
                    <span className="ml-1.5 text-subtle-foreground">
                      · {txn.ledger.icon ?? "💼"} {txn.ledger.name}
                    </span>
                  )}
                  {txn.note && (
                    <span className="ml-1.5 text-subtle-foreground">
                      · {txn.note}
                    </span>
                  )}
                </p>
              </div>

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
