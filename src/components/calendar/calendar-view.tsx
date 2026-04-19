"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import type { Transaction } from "@/types/database";

type DayEntry = { date: string; income: number; expense: number; count: number };

type Props = {
  month: number;
  year: number;
  days: DayEntry[];
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

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatMYR(n: number) {
  return n.toLocaleString("en-MY", { style: "currency", currency: "MYR" });
}

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Monday-first weekday offset for the 1st of (year, month). */
function firstWeekdayOffset(year: number, month: number): number {
  // getDay: Sun=0..Sat=6. We want Mon=0..Sun=6.
  const native = new Date(year, month - 1, 1).getDay();
  return (native + 6) % 7;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function CalendarView({ month, year, days }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [dayTxns, setDayTxns] = useState<Transaction[] | null>(null);
  const [loading, setLoading] = useState(false);

  const dayMap = useMemo(
    () => new Map(days.map((d) => [d.date, d])),
    [days],
  );

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const d of days) {
      income += d.income;
      expense += d.expense;
    }
    return { income, expense, net: income - expense };
  }, [days]);

  const maxExpense = useMemo(
    () => Math.max(1, ...days.map((d) => d.expense)),
    [days],
  );

  const go = (direction: -1 | 1) => {
    let nm = month + direction;
    let ny = year;
    if (nm < 1) {
      nm = 12;
      ny -= 1;
    } else if (nm > 12) {
      nm = 1;
      ny += 1;
    }
    router.push(`/calendar?month=${nm}&year=${ny}`);
  };

  // Arrow key navigation between months (when no modifiers / no input focused).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (selected) return; // don't interfere with drawer
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, month, year]);

  // Fetch transactions for the selected day on change.
  useEffect(() => {
    if (!selected) {
      setDayTxns(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/transactions/by-date?date=${selected}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setDayTxns(json.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setDayTxns([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const offset = firstWeekdayOffset(year, month);
  const total = daysInMonth(year, month);
  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const isToday = (d: number) =>
    today.getFullYear() === year &&
    today.getMonth() + 1 === month &&
    today.getDate() === d;

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => go(-1)}
            className="rounded-lg border border-border bg-surface p-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <h2 className="min-w-[180px] text-center text-lg font-semibold tracking-tight text-foreground">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          <button
            type="button"
            onClick={() => go(1)}
            className="rounded-lg border border-border bg-surface p-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="amount-sensitive flex items-center gap-1.5 rounded-full bg-[var(--positive-soft)] px-2.5 py-1 font-semibold text-positive tabular-nums">
            <ArrowUp className="h-3 w-3" />
            {formatMYR(totals.income)}
          </span>
          <span className="amount-sensitive flex items-center gap-1.5 rounded-full bg-[var(--negative-soft)] px-2.5 py-1 font-semibold text-negative tabular-nums">
            <ArrowDown className="h-3 w-3" />
            {formatMYR(totals.expense)}
          </span>
        </div>
      </div>

      {/* Weekday header */}
      <div className="mb-1 grid grid-cols-7 gap-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-subtle-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d, i) => {
          if (d === null) {
            return (
              <div
                key={`empty-${i}`}
                className="aspect-square rounded-xl border border-transparent"
              />
            );
          }
          const date = ymd(year, month, d);
          const entry = dayMap.get(date);
          const intensity = entry ? entry.expense / maxExpense : 0;
          const hasActivity = Boolean(entry);
          const today = isToday(d);

          return (
            <button
              key={date}
              type="button"
              onClick={() => setSelected(date)}
              aria-label={`${MONTH_NAMES[month - 1]} ${d}${entry ? `, ${entry.count} transactions` : ""}`}
              className={[
                "group relative flex aspect-square flex-col items-start justify-between rounded-xl border p-1.5 text-left transition-all sm:p-2",
                today
                  ? "border-primary/80 ring-2 ring-[var(--ring)]"
                  : "border-border hover:border-border-strong",
                hasActivity
                  ? "bg-surface hover:shadow-[var(--shadow-card)]"
                  : "bg-surface/60 hover:bg-surface",
              ].join(" ")}
              style={
                hasActivity
                  ? {
                      background: `color-mix(in oklab, var(--negative) ${Math.round(
                        intensity * 35,
                      )}%, var(--surface))`,
                    }
                  : undefined
              }
            >
              <span
                className={[
                  "text-[11px] font-semibold tabular-nums sm:text-xs",
                  today ? "text-primary" : "text-foreground",
                ].join(" ")}
              >
                {d}
              </span>
              {entry && (
                <div className="w-full space-y-0.5 text-[9px] font-medium leading-tight sm:text-[10px]">
                  {entry.expense > 0 && (
                    <p className="amount-sensitive truncate text-negative">
                      −{formatMYR(entry.expense)}
                    </p>
                  )}
                  {entry.income > 0 && (
                    <p className="amount-sensitive truncate text-positive">
                      +{formatMYR(entry.income)}
                    </p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-subtle-foreground">
        <span>Less</span>
        {[0, 0.2, 0.45, 0.7, 1].map((t, i) => (
          <span
            key={i}
            className="h-3 w-3 rounded"
            style={{
              background: `color-mix(in oklab, var(--negative) ${Math.round(
                t * 35,
              )}%, var(--surface))`,
              border: "1px solid var(--border)",
            }}
          />
        ))}
        <span>More expense</span>
        <span className="ml-auto hidden sm:inline">
          Use <kbd className="rounded border border-border bg-surface px-1 text-[10px]">←</kbd>{" "}
          <kbd className="rounded border border-border bg-surface px-1 text-[10px]">→</kbd>{" "}
          to switch months.
        </span>
      </div>

      {/* Day drawer */}
      {selected && (
        <DayDrawer
          date={selected}
          loading={loading}
          txns={dayTxns ?? []}
          entry={dayMap.get(selected) ?? null}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function DayDrawer({
  date,
  entry,
  txns,
  loading,
  onClose,
}: {
  date: string;
  entry: DayEntry | null;
  txns: Transaction[];
  loading: boolean;
  onClose: () => void;
}) {
  const [y, m, d] = date.split("-").map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />
      <aside className="glass-card-strong relative z-10 flex h-full w-full max-w-md animate-fade-in flex-col overflow-hidden border-l border-border">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle-foreground">
              Day detail
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-foreground">
              {label}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {entry && (
          <div className="grid grid-cols-2 gap-3 border-b border-border px-5 py-4 text-xs">
            <div>
              <p className="text-subtle-foreground">Income</p>
              <p className="amount-sensitive mt-1 text-lg font-semibold text-positive tabular-nums">
                {formatMYR(entry.income)}
              </p>
            </div>
            <div>
              <p className="text-subtle-foreground">Expense</p>
              <p className="amount-sensitive mt-1 text-lg font-semibold text-negative tabular-nums">
                {formatMYR(entry.expense)}
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-subtle-foreground">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            </div>
          ) : txns.length === 0 ? (
            <p className="py-10 text-center text-sm text-subtle-foreground">
              No transactions on this day.
            </p>
          ) : (
            <ul className="space-y-1">
              {txns.map((t) => {
                const amount = parseFloat(t.amount);
                const isIncome = t.type === "income";
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-muted"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                      style={{
                        background: t.category?.color
                          ? `${t.category.color}22`
                          : "var(--surface-muted)",
                      }}
                    >
                      {t.category?.icon ?? "💸"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {t.category?.name ?? "Transaction"}
                      </p>
                      {t.note && (
                        <p className="truncate text-[11px] text-muted-foreground">
                          {t.note}
                        </p>
                      )}
                    </div>
                    <p
                      className={[
                        "amount-sensitive shrink-0 text-sm font-semibold tabular-nums",
                        isIncome ? "text-positive" : "text-negative",
                      ].join(" ")}
                    >
                      {isIncome ? "+" : "−"}
                      {formatMYR(Math.abs(amount))}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
