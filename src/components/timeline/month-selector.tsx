"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useT, useLocale, formatDate as fmtDate } from "@/lib/i18n";

type Props = {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
  /** Optional ISO date string of the user's account creation. */
  accountCreatedAt?: string | null;
};

export function MonthSelector({
  month,
  year,
  onChange,
  accountCreatedAt,
}: Props) {
  const t = useT();
  const locale = useLocale();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Lower bound: 10 years before the user signed up (or before today if no
  // creation date is available). Users frequently want to back-fill old
  // transactions, so we don't want to lock the picker to the signup year.
  let lowerYear = currentYear - 10;
  const lowerMonth = 1;
  if (accountCreatedAt) {
    const created = new Date(accountCreatedAt);
    if (!Number.isNaN(created.getTime())) {
      lowerYear = created.getFullYear() - 10;
    }
  }

  const atLowerBound = year === lowerYear && month === lowerMonth;
  const atUpperBound = year === currentYear && month === currentMonth;

  function go(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    onChange(m, y);
  }

  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={() => go(-1)}
        disabled={atLowerBound}
        aria-label={t("timeline.prevMonth")}
        className="cursor-pointer rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:cursor-not-allowed disabled:text-subtle-foreground disabled:hover:bg-transparent disabled:hover:text-subtle-foreground"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <p className="min-w-[140px] text-center text-base font-medium text-foreground">
        {fmtDate(new Date(year, month - 1, 1), locale, {
          month: "long",
          year: "numeric",
        })}
      </p>
      <button
        type="button"
        onClick={() => go(1)}
        disabled={atUpperBound}
        aria-label={t("timeline.nextMonth")}
        className="cursor-pointer rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:cursor-not-allowed disabled:text-subtle-foreground disabled:hover:bg-transparent disabled:hover:text-subtle-foreground"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
