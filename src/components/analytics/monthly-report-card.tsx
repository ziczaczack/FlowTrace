"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, RefreshCw, AlertTriangle } from "lucide-react";
import type { MonthlyReport } from "@/types/database";

type Props = { report: MonthlyReport | null; previousReport?: MonthlyReport | null };

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

export function MonthlyReportCard({ report, previousReport }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [regenerating, setRegenerating] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);

  // Auto-hide the "Updated" badge ~2.5s after a successful regeneration.
  useEffect(() => {
    if (!justUpdated) return;
    const t = setTimeout(() => setJustUpdated(false), 2500);
    return () => clearTimeout(t);
  }, [justUpdated]);

  async function regenerate() {
    if (!report) return;
    setRegenerating(true);
    try {
      const res = await fetch("/api/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: report.month, year: report.year }),
      });
      if (res.ok) {
        setJustUpdated(true);
        startTransition(() => router.refresh());
      }
    } finally {
      setRegenerating(false);
    }
  }

  if (!report) {
    return (
      <div className="glass-card rounded-2xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
            Last month at a glance
          </h3>
        </div>
        <div className="space-y-3">
          <div className="h-10 animate-pulse rounded-lg bg-surface-muted" />
          <div className="h-10 animate-pulse rounded-lg bg-surface-muted" />
          <p className="pt-2 text-center text-xs text-subtle-foreground">
            Generating report...
          </p>
        </div>
      </div>
    );
  }

  const monthLabel = `${MONTH_NAMES[report.month - 1]} ${report.year}`;
  const top3 = report.categoryBreakdown.slice(0, 3);

  let netDelta: { sign: 1 | -1 | 0; amount: number; prevLabel: string } | null =
    null;
  if (previousReport) {
    const diff = report.netFlow - previousReport.netFlow;
    netDelta = {
      sign: diff > 0 ? 1 : diff < 0 ? -1 : 0,
      amount: Math.abs(diff),
      prevLabel: MONTH_NAMES[previousReport.month - 1],
    };
  }

  return (
    <div className="glass-card rounded-2xl p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
          Last month at a glance ·{" "}
          <span className="font-semibold normal-case tracking-normal text-foreground">
            {monthLabel}
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <span
            aria-hidden={!justUpdated}
            className={[
              "inline-flex items-center gap-1 rounded-full bg-positive/15 px-2 py-0.5 text-[11px] font-medium text-positive transition-opacity duration-300",
              justUpdated ? "opacity-100" : "pointer-events-none opacity-0",
            ].join(" ")}
          >
            <Check className="h-3 w-3" />
            Updated
          </span>
          <button
            type="button"
            onClick={regenerate}
            disabled={regenerating || pending}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-surface-strong hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3 w-3 ${regenerating || pending ? "animate-spin" : ""}`}
            />
            Regenerate
          </button>
        </div>
      </div>

      {/* Stat pills */}
      <div className="grid grid-cols-3 gap-2">
        <div
          className="rounded-xl px-3 py-2.5"
          style={{ background: "var(--positive-soft)" }}
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-positive">
            Income
          </p>
          <p className="mt-0.5 text-sm font-semibold text-positive tabular-nums">
            {formatMYR(report.totalIncome)}
          </p>
        </div>
        <div
          className="rounded-xl px-3 py-2.5"
          style={{ background: "var(--negative-soft)" }}
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-negative">
            Expenses
          </p>
          <p className="mt-0.5 text-sm font-semibold text-negative tabular-nums">
            {formatMYR(report.totalExpense)}
          </p>
        </div>
        <div
          className="rounded-xl px-3 py-2.5"
          style={{
            background:
              report.netFlow >= 0
                ? "var(--positive-soft)"
                : "var(--negative-soft)",
          }}
        >
          <p
            className={`text-[10px] font-medium uppercase tracking-wide ${
              report.netFlow >= 0 ? "text-positive" : "text-negative"
            }`}
          >
            Net
          </p>
          <p
            className={`mt-0.5 text-sm font-semibold tabular-nums ${
              report.netFlow >= 0 ? "text-positive" : "text-negative"
            }`}
          >
            {formatMYR(report.netFlow)}
          </p>
        </div>
      </div>

      {/* Net flow vs previous month */}
      {netDelta && netDelta.sign !== 0 && (
        <p
          className={`mt-3 text-xs ${
            netDelta.sign > 0 ? "text-positive" : "text-negative"
          }`}
        >
          {netDelta.sign > 0 ? "↑" : "↓"} {formatMYR(netDelta.amount)}{" "}
          {netDelta.sign > 0 ? "more" : "less"} than {netDelta.prevLabel}
        </p>
      )}

      {/* Top 3 categories */}
      {top3.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-subtle-foreground">
            Top spending
          </p>
          <ul className="space-y-1.5">
            {top3.map((c, i) => (
              <li
                key={c.categoryId}
                className="flex items-center justify-between rounded-lg bg-surface-muted px-3 py-2 text-xs"
              >
                <span className="flex items-center gap-2 text-foreground">
                  <span className="w-4 text-subtle-foreground">{i + 1}.</span>
                  <span aria-hidden>{c.icon}</span>
                  <span>{c.name}</span>
                </span>
                <span className="font-semibold tabular-nums text-foreground">
                  {formatMYR(c.total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Anomalies */}
      {report.anomalies.length > 0 && (
        <div className="mt-4 space-y-2">
          {report.anomalies.map((a) => (
            <div
              key={a.categoryName}
              className="flex gap-3 rounded-xl border px-3 py-2.5 text-xs"
              style={{
                borderColor: "color-mix(in oklab, var(--warning) 35%, transparent)",
                background: "var(--warning-soft)",
              }}
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: "var(--warning)" }}
              />
              <div>
                <p className="font-medium" style={{ color: "var(--warning)" }}>
                  {a.categoryName} spending is {Math.round(a.percentageOver)}%
                  above your usual
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  {formatMYR(a.currentSpend)} this month vs{" "}
                  {formatMYR(a.average)} average
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
