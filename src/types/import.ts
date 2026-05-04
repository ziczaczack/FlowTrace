// Shared types for CSV import.
import type { TransactionType } from "./database";

/**
 * What each column of a CSV row represents. Either:
 *  - `amount` is a single column with sign (- for expense, + for income); OR
 *  - `withdrawal`/`deposit` are two separate columns (mutually exclusive
 *    with `amount`).
 */
export interface ColumnMapping {
  date: number;
  description: number;
  amount?: number;
  withdrawal?: number;
  deposit?: number;
  /** Optional reference / merchant column appended to the note. */
  reference?: number;
}

export type DateFormat =
  | "DD/MM/YYYY"
  | "DD-MM-YYYY"
  | "YYYY-MM-DD"
  | "MM/DD/YYYY";

export interface BankPreset {
  id: string;
  name: string;
  hasHeader: boolean;
  dateFormat: DateFormat;
  mapping: ColumnMapping;
  /** Optional rows to skip from the top (e.g. account info banner). */
  skipRows?: number;
}

/** A single parsed row, ready to preview / categorize / commit. */
export interface ImportRow {
  /** Stable client-side id so React keys + edit operations work. */
  rowId: string;
  txnDate: string; // YYYY-MM-DD
  description: string;
  amount: number; // always positive
  type: TransactionType;
  /** Suggested category id (may be overridden by user). */
  categoryId: string | null;
  /** True if user un-checked the row in the preview. */
  include: boolean;
  /** True if a same-date+amount+description record already exists. */
  duplicate?: boolean;
  /** Raw source row for debugging / display. */
  raw: string[];
  /** If parsing failed for this row, an explanation. */
  parseError?: string;
}

export interface ImportPayload {
  ledgerId: string;
  rows: Array<{
    txnDate: string;
    amount: number;
    type: TransactionType;
    categoryId: string;
    note: string | null;
  }>;
}

export interface ImportResult {
  inserted: number;
  skipped: number;
  errors: string[];
}
