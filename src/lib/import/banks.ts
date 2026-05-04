// Bank-specific CSV templates. Each preset describes how to interpret the
// columns of a typical export from that bank's online portal. Real-world
// exports occasionally vary (formatting tweaks, extra header banners, etc.)
// so the UI lets the user override the column mapping after picking a
// preset.

import type { BankPreset, ColumnMapping, DateFormat } from "@/types/import";

export const BANK_PRESETS: BankPreset[] = [
  {
    id: "maybank",
    name: "Maybank (M2U)",
    hasHeader: true,
    dateFormat: "DD/MM/YYYY",
    skipRows: 0,
    // Date | Description | Amount (signed) | Balance
    mapping: { date: 0, description: 1, amount: 2 },
  },
  {
    id: "cimb",
    name: "CIMB Clicks",
    hasHeader: true,
    dateFormat: "DD/MM/YYYY",
    skipRows: 0,
    // Date | Reference | Description | Withdrawal | Deposit | Balance
    mapping: { date: 0, reference: 1, description: 2, withdrawal: 3, deposit: 4 },
  },
  {
    id: "publicbank",
    name: "Public Bank",
    hasHeader: true,
    dateFormat: "DD/MM/YYYY",
    skipRows: 0,
    // Date | Description | Reference | Debit | Credit | Balance
    mapping: { date: 0, description: 1, reference: 2, withdrawal: 3, deposit: 4 },
  },
  {
    id: "generic",
    name: "Generic CSV (custom mapping)",
    hasHeader: true,
    dateFormat: "YYYY-MM-DD",
    skipRows: 0,
    mapping: { date: 0, description: 1, amount: 2 },
  },
];

export function getPreset(id: string): BankPreset | null {
  return BANK_PRESETS.find((p) => p.id === id) ?? null;
}

/** Try to auto-detect a column layout from header strings. */
export function guessMapping(header: string[]): ColumnMapping {
  const norm = header.map((h) => h.trim().toLowerCase());

  const pick = (...needles: string[]): number => {
    for (const n of needles) {
      const idx = norm.findIndex((h) => h.includes(n));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const date = pick("date", "transaction date", "trans date", "posting");
  const description = pick("description", "narration", "details", "particulars");
  const reference = pick("reference", "ref no", "transaction id");
  const withdrawal = pick("withdrawal", "debit", "out", "spent");
  const deposit = pick("deposit", "credit", "in", "received");
  const amount = pick("amount", "value");

  const m: ColumnMapping = {
    date: date >= 0 ? date : 0,
    description: description >= 0 ? description : 1,
  };
  if (reference >= 0) m.reference = reference;
  if (withdrawal >= 0 && deposit >= 0) {
    m.withdrawal = withdrawal;
    m.deposit = deposit;
  } else if (amount >= 0) {
    m.amount = amount;
  } else {
    // Last-ditch fallback — assume column 2 is amount
    m.amount = 2;
  }
  return m;
}

/** Convert a date string in the given format to ISO YYYY-MM-DD. */
export function normalizeDate(raw: string, format: DateFormat): string | null {
  const s = raw.trim();
  if (!s) return null;

  const parts = s.split(/[\/\-.]/).map((p) => p.trim());
  if (parts.length !== 3) return null;

  let y: number, m: number, d: number;
  if (format === "YYYY-MM-DD") {
    [y, m, d] = parts.map(Number);
  } else if (format === "MM/DD/YYYY") {
    [m, d, y] = parts.map(Number);
  } else {
    // DD/MM/YYYY or DD-MM-YYYY
    [d, m, y] = parts.map(Number);
  }
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d))
    return null;
  if (y < 100) y += 2000; // 2-digit year support
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  const yy = String(y).padStart(4, "0");
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Strip currency prefixes, thousand separators, and parentheses, returning
 * a plain number. Returns 0 for empty cells (so withdrawal/deposit columns
 * can be used additively).
 */
export function normalizeAmount(raw: string): number {
  if (!raw) return 0;
  let s = raw.trim();
  if (!s) return 0;

  // Parenthesised negatives, e.g. "(25.00)"
  let negated = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negated = true;
    s = s.slice(1, -1);
  }

  // Strip RM, MYR, $, and any letters
  s = s.replace(/RM|MYR|\$|[a-zA-Z]/g, "");
  // Remove thousand separators (commas), keep decimal point
  s = s.replace(/,/g, "").trim();

  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return negated ? -n : n;
}
