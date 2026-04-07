"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
  /** Optional ISO date string of the user's account creation. */
  accountCreatedAt?: string | null;
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

export function MonthSelector({
  month,
  year,
  onChange,
  accountCreatedAt,
}: Props) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Lower bound: January of the year the user signed up. If we don't have
  // a creation date, fall back to January of the current year.
  let lowerYear = currentYear;
  let lowerMonth = 1;
  if (accountCreatedAt) {
    const created = new Date(accountCreatedAt);
    if (!Number.isNaN(created.getTime())) {
      lowerYear = created.getFullYear();
      lowerMonth = 1;
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
        aria-label="Previous month"
        className="rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:text-white/20 disabled:hover:bg-transparent"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <p className="min-w-[140px] text-center text-base font-medium text-white">
        {MONTH_NAMES[month - 1]} {year}
      </p>
      <button
        type="button"
        onClick={() => go(1)}
        disabled={atUpperBound}
        aria-label="Next month"
        className="rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:text-white/20 disabled:hover:bg-transparent"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
