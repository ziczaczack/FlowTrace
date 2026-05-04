// Pure detection of recurring expenses ("subscription radar").
//
// Given a list of expense transactions over the last ~4 months, group by
// (category, normalized note, amount) and flag any group whose timeline
// matches a monthly or weekly cadence. Surfaced on the dashboard as
// candidate subscriptions the user can confirm into a `recurring_rules` row.

import type { Transaction } from "@/types/database";

export type DetectedFrequency = "monthly" | "weekly";

export interface DetectedSubscription {
  signature: string;
  name: string;
  amount: number;
  ledgerId: string;
  categoryId: string | null;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  frequency: DetectedFrequency;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
  predictedNextDue: string;
  alreadyLinked: boolean;
}

const MONTHLY_MIN = 27;
const MONTHLY_MAX = 33;
const WEEKLY_MIN = 6;
const WEEKLY_MAX = 8;

function normalizeNote(note: string | null | undefined): string {
  if (!note) return "";
  return note.trim().toLowerCase().replace(/\s+/g, " ");
}

function dateDiffDays(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`);
  const db = new Date(`${b}T00:00:00`);
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
}

export function detectSubscriptions(
  transactions: Transaction[],
): DetectedSubscription[] {
  // Bucket by (category + normalized note + amount). Transactions with no
  // note AND no category share too little signal to confidently group, so
  // we drop them — those are typically one-off cash purchases.
  type Group = {
    txns: Transaction[];
    amount: number;
    categoryId: string | null;
  };
  const groups = new Map<string, Group>();

  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const amt = parseFloat(t.amount);
    if (!Number.isFinite(amt) || amt <= 0) continue;
    const noteKey = normalizeNote(t.note);
    if (noteKey === "" && !t.category_id) continue;
    const amtBucket = Math.round(amt * 100) / 100;
    const key = `${t.ledger_id}|${t.category_id ?? "none"}|${noteKey}|${amtBucket}`;
    const g = groups.get(key);
    if (g) g.txns.push(t);
    else
      groups.set(key, {
        txns: [t],
        amount: amtBucket,
        categoryId: t.category_id,
      });
  }

  const detected: DetectedSubscription[] = [];

  for (const [signature, g] of groups) {
    if (g.txns.length < 2) continue;

    const sorted = [...g.txns].sort((a, b) =>
      a.txn_date.localeCompare(b.txn_date),
    );
    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      intervals.push(dateDiffDays(sorted[i - 1].txn_date, sorted[i].txn_date));
    }

    const med = median(intervals);
    let frequency: DetectedFrequency | null = null;
    let cadenceDays = 0;
    if (med >= MONTHLY_MIN && med <= MONTHLY_MAX) {
      frequency = "monthly";
      cadenceDays = Math.round(med);
    } else if (med >= WEEKLY_MIN && med <= WEEKLY_MAX) {
      frequency = "weekly";
      cadenceDays = Math.round(med);
    }
    if (!frequency) continue;

    // At least 60% of the gaps must agree with the cadence to call it
    // recurring rather than coincidental. Allows for the occasional skipped
    // or doubled month (e.g. annual billing month, refund, retry).
    const agree = intervals.filter((d) =>
      frequency === "monthly"
        ? d >= MONTHLY_MIN - 2 && d <= MONTHLY_MAX + 2
        : d >= WEEKLY_MIN - 1 && d <= WEEKLY_MAX + 1,
    ).length;
    if (agree / intervals.length < 0.6) continue;

    const last = sorted[sorted.length - 1];
    const first = sorted[0];
    const cat = last.category;

    const displayName =
      last.note?.trim() || cat?.name || "Recurring expense";

    detected.push({
      signature,
      name: displayName,
      amount: g.amount,
      ledgerId: last.ledger_id,
      categoryId: g.categoryId,
      categoryName: cat?.name ?? "Uncategorised",
      categoryIcon: cat?.icon ?? "📦",
      categoryColor: cat?.color ?? "#6B7280",
      frequency,
      occurrenceCount: sorted.length,
      firstSeen: first.txn_date,
      lastSeen: last.txn_date,
      predictedNextDue: addDays(last.txn_date, cadenceDays),
      alreadyLinked: sorted.some((t) => t.recurring_rule_id != null),
    });
  }

  detected.sort(
    (a, b) =>
      Number(b.alreadyLinked === false) - Number(a.alreadyLinked === false) ||
      b.occurrenceCount - a.occurrenceCount ||
      b.amount - a.amount,
  );

  return detected;
}

/**
 * Given a list of detected subscriptions and the user's currently active
 * recurring_rules, drop detections whose (amount × name) match an existing
 * rule. Defensive — already-linked transactions are also filtered out
 * inside `detectSubscriptions`, but rules can predate any linked txn.
 */
export function filterUnconfirmed<T extends { name: string; amount: number; alreadyLinked: boolean }>(
  detections: T[],
  existingRules: { name: string; amount: string }[],
): T[] {
  const known = new Set(
    existingRules.map(
      (r) => `${r.name.trim().toLowerCase()}|${parseFloat(r.amount).toFixed(2)}`,
    ),
  );
  return detections.filter((d) => {
    if (d.alreadyLinked) return false;
    const k = `${d.name.trim().toLowerCase()}|${d.amount.toFixed(2)}`;
    return !known.has(k);
  });
}
