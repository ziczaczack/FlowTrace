import { format, isToday, isYesterday, parseISO } from "date-fns";
import type { GroupedTransactions, Transaction } from "@/types/database";

/**
 * Group a flat, already-sorted (DESC) Transaction[] into per-day buckets.
 * Order within each group is preserved. Bucket order matches input order.
 */
export function groupTransactionsByDate(
  transactions: Transaction[],
): GroupedTransactions[] {
  const groups = new Map<string, Transaction[]>();
  for (const txn of transactions) {
    const list = groups.get(txn.txn_date);
    if (list) list.push(txn);
    else groups.set(txn.txn_date, [txn]);
  }

  const result: GroupedTransactions[] = [];
  for (const [date, list] of groups) {
    result.push({ date, label: dateLabel(date), transactions: list });
  }
  return result;
}

function dateLabel(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEE, d MMM");
}

/** "RM 1,234.56" — always 2dp. */
export function formatMYR(amount: number): string {
  return `RM ${amount.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Compact form: "RM 999.00" / "RM 1.2k" / "RM 1.2M". */
export function formatMYRCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    return `${sign}RM ${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}RM ${(abs / 1_000).toFixed(1)}k`;
  }
  return formatMYR(amount);
}
