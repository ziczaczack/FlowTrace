// Server-side query helpers for FlowTrace.
// All functions in this file MUST be called from a Server Component, Route
// Handler, or Server Action — never from client code.

import { createClient } from "@/lib/supabase/server";
import type {
  Category,
  CategoryTotal,
  Ledger,
  MonthlyFlow,
  Transaction,
} from "@/types/database";
import type { NewTransaction } from "@/types/forms";

export interface DashboardSummary {
  totalBalance: number;
  currentMonth: { income: number; expense: number; net: number };
  last6Months: MonthlyFlow[];
}

/** Build a YYYY-MM-DD string for the first day of a (year, month). */
function firstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

/** Build a YYYY-MM-DD string for the last day of a (year, month). */
function lastDayOfMonth(year: number, month: number): string {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

/**
 * Returns the user's default ledger, creating one ("My Wallet") on first call.
 */
export async function getOrCreateDefaultLedger(userId: string): Promise<Ledger> {
  const supabase = await createClient();

  // There's no unique constraint on (user_id, is_default), so it's possible
  // for a user to end up with multiple default ledgers (e.g. from earlier
  // testing). Take the oldest one and treat it as canonical instead of
  // failing with "multiple rows returned".
  const { data: existing, error: selectError } = await supabase
    .from("ledgers")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .order("created_at", { ascending: true })
    .limit(1);

  if (selectError) throw new Error(selectError.message);
  if (existing && existing.length > 0) return existing[0] as Ledger;

  // Fallback: if no row is flagged is_default but the user has any ledger,
  // adopt the oldest one rather than creating a duplicate.
  const { data: anyLedger, error: anyError } = await supabase
    .from("ledgers")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (anyError) throw new Error(anyError.message);
  if (anyLedger && anyLedger.length > 0) return anyLedger[0] as Ledger;

  const { data: created, error: insertError } = await supabase
    .from("ledgers")
    .insert({
      user_id: userId,
      name: "My Wallet",
      type: "personal",
      currency: "MYR",
      is_default: true,
    })
    .select("*")
    .single();

  if (insertError) throw new Error(insertError.message);
  return created as Ledger;
}

/**
 * Fetches all transactions for a ledger within a given month/year, with their
 * joined category metadata, ordered newest first.
 */
export async function getTransactions(
  ledgerId: string,
  month: number,
  year: number,
): Promise<Transaction[]> {
  const supabase = await createClient();

  // First and last day of the requested month.
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  // Day 0 of next month = last day of this month.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      id, ledger_id, category_id, recurring_rule_id, transfer_pair_id,
      amount, type, payment_method, note, txn_date, created_at,
      category:categories ( id, name, icon, color )
      `,
    )
    .eq("ledger_id", ledgerId)
    .gte("txn_date", start)
    .lte("txn_date", end)
    .order("txn_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Transaction[];
}

/**
 * Fetch all transactions across every ledger belonging to a user, for a
 * given month/year. Joined with category metadata. Newest first.
 */
export async function getTransactionsByMonth(
  userId: string,
  month: number,
  year: number,
): Promise<Transaction[]> {
  const supabase = await createClient();

  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("ledgers")
    .select("id")
    .eq("user_id", userId);
  if (ledgerError) throw new Error(ledgerError.message);
  const ledgerIds = (ledgerRows ?? []).map((l) => l.id as string);
  if (ledgerIds.length === 0) return [];

  const start = firstDayOfMonth(year, month);
  const end = lastDayOfMonth(year, month);

  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      id, ledger_id, category_id, recurring_rule_id, transfer_pair_id,
      amount, type, payment_method, note, txn_date, created_at,
      category:categories ( id, name, icon, color )
      `,
    )
    .in("ledger_id", ledgerIds)
    .gte("txn_date", start)
    .lte("txn_date", end)
    .order("txn_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Transaction[];
}

/**
 * Total income / expense / net across ALL ledgers for the given month.
 */
export async function getMonthSummary(
  userId: string,
  month: number,
  year: number,
): Promise<{ income: number; expense: number; net: number }> {
  const supabase = await createClient();

  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("ledgers")
    .select("id")
    .eq("user_id", userId);
  if (ledgerError) throw new Error(ledgerError.message);
  const ledgerIds = (ledgerRows ?? []).map((l) => l.id as string);
  if (ledgerIds.length === 0) return { income: 0, expense: 0, net: 0 };

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, type")
    .in("ledger_id", ledgerIds)
    .gte("txn_date", firstDayOfMonth(year, month))
    .lte("txn_date", lastDayOfMonth(year, month));
  if (error) throw new Error(error.message);

  let income = 0;
  let expense = 0;
  for (const row of (data ?? []) as Array<{ amount: string; type: string }>) {
    const value = parseFloat(row.amount);
    if (!Number.isFinite(value)) continue;
    if (row.type === "income") income += value;
    else if (row.type === "expense") expense += value;
  }
  return { income, expense, net: income - expense };
}

/**
 * Insert one transaction.
 */
export async function addTransaction(
  ledgerId: string,
  data: NewTransaction,
): Promise<Transaction> {
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("transactions")
    .insert({
      ledger_id: ledgerId,
      category_id: data.categoryId,
      amount: data.amount,
      type: data.type,
      payment_method: data.paymentMethod,
      note: data.note ?? null,
      txn_date: data.txnDate,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return row as Transaction;
}

/**
 * Update an existing transaction by id.
 */
export async function updateTransaction(
  id: string,
  data: Partial<NewTransaction>,
): Promise<Transaction> {
  const supabase = await createClient();

  const patch: Record<string, unknown> = {};
  if (data.amount !== undefined) patch.amount = data.amount;
  if (data.type !== undefined) patch.type = data.type;
  if (data.categoryId !== undefined) patch.category_id = data.categoryId;
  if (data.paymentMethod !== undefined) patch.payment_method = data.paymentMethod;
  if (data.note !== undefined) patch.note = data.note;
  if (data.txnDate !== undefined) patch.txn_date = data.txnDate;

  const { data: row, error } = await supabase
    .from("transactions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return row as Transaction;
}

/**
 * Delete a transaction by id.
 */
export async function deleteTransaction(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Fetch all categories visible to a user: system defaults (user_id IS NULL)
 * plus the user's own custom categories. System categories are returned
 * first; both groups are alphabetised by name.
 */
export async function getCategories(userId: string): Promise<Category[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .or(`user_id.is.null,user_id.eq.${userId}`);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Category[];
  return rows.sort((a, b) => {
    // System (null user_id) before custom.
    const aSystem = a.user_id === null ? 0 : 1;
    const bSystem = b.user_id === null ? 0 : 1;
    if (aSystem !== bSystem) return aSystem - bSystem;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Aggregated dashboard figures for a user across ALL of their ledgers:
 * - lifetime net flow (totalBalance)
 * - current-month income / expense / net
 * - the last 6 months of income/expense, oldest → newest
 */
export async function getDashboardSummary(
  userId: string,
): Promise<DashboardSummary> {
  const supabase = await createClient();

  // 1. Find every ledger this user owns. We use these IDs to scope the
  //    transaction queries (RLS would do this anyway, but we'd still need
  //    them locally for the aggregations).
  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("ledgers")
    .select("id")
    .eq("user_id", userId);
  if (ledgerError) throw new Error(ledgerError.message);
  const ledgerIds = (ledgerRows ?? []).map((l) => l.id as string);

  if (ledgerIds.length === 0) {
    return emptyDashboardSummary();
  }

  // 2. Pull only the columns we need for in-memory aggregation. The volume
  //    is bounded to a single user's history; for larger ledgers we'd
  //    push this into a SQL view or RPC.
  const { data: txnRows, error: txnError } = await supabase
    .from("transactions")
    .select("amount, type, txn_date")
    .in("ledger_id", ledgerIds);
  if (txnError) throw new Error(txnError.message);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Pre-compute the last 6 month buckets (oldest → newest).
  const buckets: MonthlyFlow[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1);
    buckets.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      income: 0,
      expense: 0,
    });
  }
  const bucketKey = (m: number, y: number) => `${y}-${m}`;
  const bucketIndex = new Map(
    buckets.map((b, idx) => [bucketKey(b.month, b.year), idx]),
  );

  let totalIncome = 0;
  let totalExpense = 0;
  let monthIncome = 0;
  let monthExpense = 0;

  for (const row of (txnRows ?? []) as Array<{
    amount: string;
    type: string;
    txn_date: string;
  }>) {
    const value = parseFloat(row.amount);
    if (!Number.isFinite(value)) continue;
    // Transfers don't affect totals — they net to zero.
    if (row.type === "income") totalIncome += value;
    else if (row.type === "expense") totalExpense += value;

    // txn_date is YYYY-MM-DD; parse the leading parts directly to avoid
    // any timezone-shift surprises.
    const [yStr, mStr] = row.txn_date.split("-");
    const y = Number(yStr);
    const m = Number(mStr);

    if (y === currentYear && m === currentMonth) {
      if (row.type === "income") monthIncome += value;
      else if (row.type === "expense") monthExpense += value;
    }

    const idx = bucketIndex.get(bucketKey(m, y));
    if (idx !== undefined) {
      if (row.type === "income") buckets[idx].income += value;
      else if (row.type === "expense") buckets[idx].expense += value;
    }
  }

  return {
    totalBalance: totalIncome - totalExpense,
    currentMonth: {
      income: monthIncome,
      expense: monthExpense,
      net: monthIncome - monthExpense,
    },
    last6Months: buckets,
  };
}

function emptyDashboardSummary(): DashboardSummary {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const buckets: MonthlyFlow[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1);
    buckets.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      income: 0,
      expense: 0,
    });
  }
  return {
    totalBalance: 0,
    currentMonth: { income: 0, expense: 0, net: 0 },
    last6Months: buckets,
  };
}

/**
 * Current-month expense breakdown by category for a user, joined with the
 * category metadata so the chart can colour each slice. Sorted high → low,
 * with `percentage` already computed.
 */
export async function getCurrentMonthByCategory(
  userId: string,
): Promise<CategoryTotal[]> {
  const supabase = await createClient();

  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("ledgers")
    .select("id")
    .eq("user_id", userId);
  if (ledgerError) throw new Error(ledgerError.message);
  const ledgerIds = (ledgerRows ?? []).map((l) => l.id as string);
  if (ledgerIds.length === 0) return [];

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      amount, category_id,
      category:categories ( id, name, icon, color )
      `,
    )
    .in("ledger_id", ledgerIds)
    .eq("type", "expense")
    .gte("txn_date", firstDayOfMonth(year, month))
    .lte("txn_date", lastDayOfMonth(year, month));
  if (error) throw new Error(error.message);

  type Row = {
    amount: string;
    category_id: string | null;
    category:
      | { id: string; name: string; icon: string | null; color: string | null }
      | { id: string; name: string; icon: string | null; color: string | null }[]
      | null;
  };

  const totals = new Map<string, CategoryTotal>();
  let grandTotal = 0;

  for (const row of (data ?? []) as Row[]) {
    const value = parseFloat(row.amount);
    if (!Number.isFinite(value)) continue;
    const cat = Array.isArray(row.category) ? row.category[0] : row.category;
    const id = cat?.id ?? row.category_id ?? "uncategorised";
    const name = cat?.name ?? "Uncategorised";
    const icon = cat?.icon ?? "📦";
    const color = cat?.color ?? "#6B7280";

    grandTotal += value;
    const existing = totals.get(id);
    if (existing) {
      existing.total += value;
    } else {
      totals.set(id, {
        categoryId: id,
        name,
        icon,
        color,
        total: value,
        percentage: 0,
      });
    }
  }

  const list = Array.from(totals.values());
  for (const item of list) {
    item.percentage = grandTotal > 0 ? (item.total / grandTotal) * 100 : 0;
  }
  list.sort((a, b) => b.total - a.total);
  return list;
}
