"use client";

import { useState } from "react";
import { Download, Sparkles, X } from "lucide-react";
import type { YearInReview } from "@/lib/supabase/queries";

const formatMYR = (n: number) =>
  `RM ${n.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;

type Props = {
  review: YearInReview | null;
  yearOptions: number[];
  defaultYear: number;
};

export function YearInReviewCard({ review, yearOptions, defaultYear }: Props) {
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(defaultYear);

  if (!review) return null;

  function downloadImage() {
    window.location.href = `/api/year-in-review/image?year=${year}`;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-strong"
      >
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        Year in review
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
          <div
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
          />
          <div className="glass-card-strong relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl">
            <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                <h3 className="text-sm font-semibold text-foreground">
                  Year in review
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {yearOptions.length > 1 && (
                  <select
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="cursor-pointer rounded-lg border border-border bg-surface-muted px-2 py-1 text-xs text-foreground outline-none"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-subtle-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              <ReviewPreview review={review} />
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
              <p className="text-xs text-subtle-foreground">
                PNG is generated server-side · 1080 × 1350
              </p>
              <button
                type="button"
                onClick={downloadImage}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
              >
                <Download className="h-4 w-4" />
                Save image
              </button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}

/** HTML-rendered preview that mirrors the PNG layout. Uses inline styles
 *  for the gradient/colours so the preview matches the OG image closely. */
function ReviewPreview({ review }: { review: YearInReview }) {
  const subtitle =
    review.activeMonths >= 12
      ? "A full year of tracked spending"
      : `${review.activeMonths} active month${review.activeMonths === 1 ? "" : "s"}`;

  return (
    <div
      className="rounded-3xl p-7 text-emerald-50"
      style={{
        background:
          "linear-gradient(160deg, #064e3b 0%, #0f172a 60%, #022c22 100%)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: "#10b981" }}
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 64 64"
            fill="none"
            stroke="#ffffff"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 42 L26 30 L34 38 L50 22" />
            <path d="M36 22 H50 V36" />
          </svg>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-xs uppercase tracking-[0.18em] text-emerald-200">
            FlowTrace
          </span>
          <span className="text-sm text-emerald-300">Year in review</span>
        </div>
        <span
          className="ml-auto text-5xl font-bold tracking-tight tabular-nums"
          style={{ color: "#10b981" }}
        >
          {review.year}
        </span>
      </div>

      <div className="mt-7 flex flex-col">
        <span className="text-sm text-emerald-200">You spent</span>
        <span className="mt-1 text-5xl font-bold tracking-tight text-white tabular-nums sm:text-6xl">
          {formatMYR(review.totalExpense)}
        </span>
        <span className="mt-2 text-xs text-emerald-300">
          across {review.txnCount.toLocaleString("en-MY")} transactions ·{" "}
          {subtitle}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-wide text-emerald-200">
            Net flow
          </p>
          <p
            className="mt-1 text-2xl font-bold tabular-nums"
            style={{
              color: review.netFlow >= 0 ? "#34d399" : "#fca5a5",
            }}
          >
            {review.netFlow >= 0 ? "+" : "−"}
            {formatMYR(Math.abs(review.netFlow))}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-[11px] uppercase tracking-wide text-emerald-200">
            Savings rate
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-white">
            {review.savingsRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {review.topCategories.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-emerald-200">
            Top spending
          </p>
          <ul className="flex flex-col gap-2">
            {review.topCategories.map((c, i) => {
              const pct =
                review.totalExpense > 0
                  ? (c.total / review.totalExpense) * 100
                  : 0;
              return (
                <li
                  key={c.name}
                  className="flex items-center gap-3 text-sm text-white"
                >
                  <span className="w-6 text-emerald-300 tabular-nums">
                    {i + 1}.
                  </span>
                  <span className="text-lg" aria-hidden>
                    {c.icon}
                  </span>
                  <span className="flex-1 truncate">{c.name}</span>
                  <span className="text-emerald-200 tabular-nums">
                    {pct.toFixed(0)}%
                  </span>
                  <span className="w-24 text-right font-semibold tabular-nums">
                    {formatMYR(c.total)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between text-[11px] text-emerald-300">
        <span>flowtrace · personal finance, finally calm</span>
        {review.biggestDay && (
          <span>
            Biggest day: {review.biggestDay.date} ·{" "}
            {formatMYR(review.biggestDay.total)}
          </span>
        )}
      </div>
    </div>
  );
}
