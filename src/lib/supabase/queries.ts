// Server-side query helpers for FlowTrace.
// All functions in this file MUST be called from a Server Component, Route
// Handler, or Server Action — never from client code.

import { createClient } from "@/lib/supabase/server";
import type {
  Budget,
  BudgetWithCategory,
  Category,
  CategoryBudgetItem,
  CategoryTotal,
  Ledger,
  LedgerMemberWithProfile,
  LedgerRole,
  LedgerWithMembership,
  MonthlyFlow,
  RecurringRule,
  SavingsGoal,
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
 * Returns the user's default ledger, creating one ("My Wallet") only if the
 * user genuinely has no ledger yet.
 *
 * Defensive against transient RLS hiccups (auth token refresh, rate limits)
 * by checking BOTH `ledger_members` and `ledgers` directly before falling
 * through to the INSERT path. Either query returning a row means the user
 * already has access to a ledger — never create a phantom "My Wallet" just
 * because one read came back empty.
 */
export async function getOrCreateDefaultLedger(userId: string): Promise<Ledger> {
  const supabase = await createClient();

  // Path 1 — via ledger_members (post-shared-ledgers source of truth).
  const { data: memberships, error: memError } = await supabase
    .from("ledger_members")
    .select(`role, ledger:ledgers(*)`)
    .eq("user_id", userId);
  if (memError) throw new Error(memError.message);

  if (memberships && memberships.length > 0) {
    type Row = { role: string; ledger: Ledger | null };
    const rows = (memberships as unknown as Row[]).filter(
      (r): r is { role: string; ledger: Ledger } => r.ledger !== null,
    );
    if (rows.length > 0) {
      const owned = rows.filter((r) => r.role === "owner");
      const ownedDefault = owned.find((r) => r.ledger.is_default);
      const pick = ownedDefault ?? owned[0] ?? rows[0];
      return pick.ledger;
    }
  }

  // Path 2 — direct ledgers query as a second-opinion. RLS on `ledgers` is
  // independent from `ledger_members`, so if path 1 was a transient miss
  // (e.g. auth.uid() was null for a moment) this path is likely to catch
  // it. Skipping the INSERT here prevents the duplicate-"My Wallet" bug.
  const { data: ownedLedgers, error: ownedError } = await supabase
    .from("ledgers")
    .select("*")
    .eq("user_id", userId);
  if (ownedError) throw new Error(ownedError.message);

  if (ownedLedgers && ownedLedgers.length > 0) {
    const owned = ownedLedgers as Ledger[];
    return owned.find((l) => l.is_default) ?? owned[0];
  }

  // Both paths empty — user genuinely has no ledger yet. The
  // ledgers_after_insert_membership trigger registers them as owner in
  // ledger_members automatically.
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
 * Lists every ledger the current user can access (own + shared) with their
 * role on each and the total member count.
 */
export async function getMyLedgers(
  userId: string,
): Promise<LedgerWithMembership[]> {
  const supabase = await createClient();

  // RLS scopes ledgers to those the user is a member of. Pull the user's
  // role per ledger via an inner join on ledger_members.
  const { data: ledgerRows, error: ledgersError } = await supabase
    .from("ledgers")
    .select(`*, ledger_members!inner ( role, user_id )`)
    .eq("ledger_members.user_id", userId);
  if (ledgersError) throw new Error(ledgersError.message);

  const ids = (ledgerRows ?? []).map((l) => l.id as string);
  if (ids.length === 0) return [];

  // Member counts in one round-trip — group manually since PostgREST does
  // not expose group-by aggregation directly.
  const { data: memberRows, error: memberError } = await supabase
    .from("ledger_members")
    .select("ledger_id")
    .in("ledger_id", ids);
  if (memberError) throw new Error(memberError.message);

  const counts = new Map<string, number>();
  for (const row of memberRows ?? []) {
    counts.set(row.ledger_id, (counts.get(row.ledger_id) ?? 0) + 1);
  }

  return (ledgerRows ?? []).map((l) => {
    const memberRow = (
      l.ledger_members as Array<{ role: LedgerRole; user_id: string }>
    ).find((m) => m.user_id === userId);
    const { ledger_members: _ignored, ...ledger } = l as Ledger & {
      ledger_members: unknown;
    };
    void _ignored;
    return {
      ...ledger,
      role: memberRow?.role ?? "viewer",
      member_count: counts.get(l.id as string) ?? 1,
    };
  }) as LedgerWithMembership[];
}

/**
 * Returns every member of the given ledger, including their email. The
 * caller must be a member (RLS + the SECURITY DEFINER RPC enforce this).
 */
export async function getLedgerMembers(
  ledgerId: string,
): Promise<LedgerMemberWithProfile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_ledger_member_emails", {
    p_ledger_id: ledgerId,
  });
  if (error) throw new Error(error.message);
  type Row = {
    user_id: string;
    email: string | null;
    role: LedgerRole;
    joined_at: string;
  };
  return ((data ?? []) as Row[]).map((r) => ({
    ledger_id: ledgerId,
    user_id: r.user_id,
    role: r.role,
    invited_by: null,
    joined_at: r.joined_at,
    email: r.email,
    full_name: null,
  }));
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
    .select("id");
  // RLS scopes to ledgers the user is a member of (owned or shared).
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
      category:categories ( id, name, icon, color ),
      ledger:ledgers ( id, name, icon )
      `,
    )
    .in("ledger_id", ledgerIds)
    .gte("txn_date", start)
    .lte("txn_date", end)
    .order("txn_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  void userId;
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
    .select("id");
  // RLS scopes to ledgers the user is a member of (owned or shared).
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
    .select("id");
  // RLS scopes to ledgers the user is a member of (owned or shared).
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

/**
 * Last 12 months of income/expense/net for the user, oldest → newest.
 * Includes the current month.
 */
export async function getLast12MonthsFlow(
  userId: string,
): Promise<MonthlyFlow[]> {
  const supabase = await createClient();

  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("ledgers")
    .select("id");
  // RLS scopes to ledgers the user is a member of (owned or shared).
  if (ledgerError) throw new Error(ledgerError.message);
  const ledgerIds = (ledgerRows ?? []).map((l) => l.id as string);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const buckets: MonthlyFlow[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(currentYear, currentMonth - 1 - i, 1);
    buckets.push({
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      income: 0,
      expense: 0,
    });
  }
  if (ledgerIds.length === 0) return buckets;

  const start = firstDayOfMonth(buckets[0].year, buckets[0].month);
  const end = lastDayOfMonth(currentYear, currentMonth);

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, type, txn_date")
    .in("ledger_id", ledgerIds)
    .gte("txn_date", start)
    .lte("txn_date", end);
  if (error) throw new Error(error.message);

  const bucketKey = (m: number, y: number) => `${y}-${m}`;
  const idxMap = new Map(
    buckets.map((b, idx) => [bucketKey(b.month, b.year), idx]),
  );

  for (const row of (data ?? []) as Array<{
    amount: string;
    type: string;
    txn_date: string;
  }>) {
    const value = parseFloat(row.amount);
    if (!Number.isFinite(value)) continue;
    const [yStr, mStr] = row.txn_date.split("-");
    const idx = idxMap.get(bucketKey(Number(mStr), Number(yStr)));
    if (idx === undefined) continue;
    if (row.type === "income") buckets[idx].income += value;
    else if (row.type === "expense") buckets[idx].expense += value;
  }

  return buckets;
}

/**
 * Compares this month's expense by category against last month's. Categories
 * are ordered by current-month spend descending. Categories present in only
 * one month are still returned with `total: 0` for the missing month.
 */
export async function getCurrentVsPreviousMonth(userId: string): Promise<{
  categories: string[];
  current: CategoryTotal[];
  previous: CategoryTotal[];
}> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const prevDate = new Date(currentYear, currentMonth - 2, 1);
  const prevMonth = prevDate.getMonth() + 1;
  const prevYear = prevDate.getFullYear();

  const [current, previous] = await Promise.all([
    getCategoryMonthlyBreakdown(userId, currentMonth, currentYear),
    getCategoryMonthlyBreakdown(userId, prevMonth, prevYear),
  ]);

  // Union of category ids preserving "current first DESC" then any prev-only.
  const currentMap = new Map(current.map((c) => [c.categoryId, c]));
  const previousMap = new Map(previous.map((c) => [c.categoryId, c]));

  const orderedIds: string[] = [];
  for (const c of current) orderedIds.push(c.categoryId);
  for (const p of previous) {
    if (!currentMap.has(p.categoryId)) orderedIds.push(p.categoryId);
  }

  const meta = (id: string) => currentMap.get(id) ?? previousMap.get(id)!;

  const currentOut: CategoryTotal[] = orderedIds.map((id) => {
    const c = currentMap.get(id);
    if (c) return c;
    const m = meta(id);
    return {
      categoryId: id,
      name: m.name,
      icon: m.icon,
      color: m.color,
      total: 0,
      percentage: 0,
    };
  });
  const previousOut: CategoryTotal[] = orderedIds.map((id) => {
    const p = previousMap.get(id);
    if (p) return p;
    const m = meta(id);
    return {
      categoryId: id,
      name: m.name,
      icon: m.icon,
      color: m.color,
      total: 0,
      percentage: 0,
    };
  });

  return {
    categories: orderedIds.map((id) => meta(id).name),
    current: currentOut,
    previous: previousOut,
  };
}

/**
 * Expense breakdown by category for an arbitrary (month, year), sorted DESC.
 */
export async function getCategoryMonthlyBreakdown(
  userId: string,
  month: number,
  year: number,
): Promise<CategoryTotal[]> {
  const supabase = await createClient();

  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("ledgers")
    .select("id");
  // RLS scopes to ledgers the user is a member of (owned or shared).
  if (ledgerError) throw new Error(ledgerError.message);
  const ledgerIds = (ledgerRows ?? []).map((l) => l.id as string);
  if (ledgerIds.length === 0) return [];

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

export interface MoneyFlow {
  income: CategoryTotal[];
  expense: CategoryTotal[];
  totalIncome: number;
  totalExpense: number;
}

/**
 * Income + expense breakdown for a single month, both grouped by category.
 * Powers the Sankey diagram on Analytics. Returns lists sorted DESC by total.
 */
export async function getMoneyFlow(
  userId: string,
  month: number,
  year: number,
): Promise<MoneyFlow> {
  const supabase = await createClient();

  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("ledgers")
    .select("id");
  // RLS scopes to ledgers the user is a member of (owned or shared).
  if (ledgerError) throw new Error(ledgerError.message);
  const ledgerIds = (ledgerRows ?? []).map((l) => l.id as string);
  if (ledgerIds.length === 0) {
    return { income: [], expense: [], totalIncome: 0, totalExpense: 0 };
  }

  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      amount, type, category_id,
      category:categories ( id, name, icon, color )
      `,
    )
    .in("ledger_id", ledgerIds)
    .in("type", ["income", "expense"])
    .gte("txn_date", firstDayOfMonth(year, month))
    .lte("txn_date", lastDayOfMonth(year, month));
  if (error) throw new Error(error.message);

  type Row = {
    amount: string;
    type: "income" | "expense" | "transfer";
    category_id: string | null;
    category:
      | { id: string; name: string; icon: string | null; color: string | null }
      | { id: string; name: string; icon: string | null; color: string | null }[]
      | null;
  };

  const incomeMap = new Map<string, CategoryTotal>();
  const expenseMap = new Map<string, CategoryTotal>();
  let totalIncome = 0;
  let totalExpense = 0;

  for (const row of (data ?? []) as Row[]) {
    const value = parseFloat(row.amount);
    if (!Number.isFinite(value)) continue;
    const cat = Array.isArray(row.category) ? row.category[0] : row.category;
    const id = cat?.id ?? row.category_id ?? "uncategorised";
    const name = cat?.name ?? "Uncategorised";
    const icon = cat?.icon ?? "📦";
    const color = cat?.color ?? "#6B7280";

    const target = row.type === "income" ? incomeMap : expenseMap;
    const existing = target.get(id);
    if (existing) {
      existing.total += value;
    } else {
      target.set(id, { categoryId: id, name, icon, color, total: value, percentage: 0 });
    }

    if (row.type === "income") totalIncome += value;
    else totalExpense += value;
  }

  const finalize = (m: Map<string, CategoryTotal>, grand: number) => {
    const arr = Array.from(m.values());
    for (const it of arr) it.percentage = grand > 0 ? (it.total / grand) * 100 : 0;
    arr.sort((a, b) => b.total - a.total);
    return arr;
  };

  return {
    income: finalize(incomeMap, totalIncome),
    expense: finalize(expenseMap, totalExpense),
    totalIncome,
    totalExpense,
  };
}

/**
 * Fetch all budgets for a user with joined category metadata.
 */
export async function getBudgets(userId: string): Promise<BudgetWithCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budgets")
    .select("*, category:categories ( id, name, icon, color )")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as BudgetWithCategory[];
}

/**
 * Upsert a monthly budget for a category (create or update limit).
 */
export async function upsertBudget(
  userId: string,
  categoryId: string,
  amountLimit: number,
): Promise<Budget> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      {
        user_id: userId,
        category_id: categoryId,
        amount_limit: amountLimit,
        period: "monthly",
      },
      { onConflict: "user_id,category_id,period" },
    )
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Budget;
}

/**
 * Delete a budget by its id.
 */
export async function deleteBudget(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.from("budgets").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Returns all expense categories joined with the user's current budget limits
 * and their spending for the given month, for the budget overview UI.
 * Only returns categories that have spending or a budget set.
 */
export async function getCategoryBudgetOverview(
  userId: string,
  month: number,
  year: number,
): Promise<CategoryBudgetItem[]> {
  const [categories, budgets, spending] = await Promise.all([
    getCategories(userId),
    getBudgets(userId),
    getCategoryMonthlyBreakdown(userId, month, year),
  ]);

  const budgetMap = new Map(budgets.map((b) => [b.category_id, b]));
  const spendMap = new Map(spending.map((s) => [s.categoryId, s.total]));

  const expenseCategories = categories.filter((c) => c.type === "expense");

  return expenseCategories
    .map((cat) => {
      const budget = budgetMap.get(cat.id);
      const currentSpend = spendMap.get(cat.id) ?? 0;
      const budgetLimit = budget ? parseFloat(budget.amount_limit) : null;
      const percentage =
        budgetLimit && budgetLimit > 0
          ? Math.min((currentSpend / budgetLimit) * 100, 999)
          : 0;
      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        categoryColor: cat.color,
        budgetId: budget?.id ?? null,
        budgetLimit,
        currentSpend,
        percentage,
      };
    })
    .filter((item) => item.currentSpend > 0 || item.budgetLimit !== null);
}

/**
 * Daily income + expense totals for a user across a month. Returns one row
 * per day with transactions (days with no transactions are omitted). Used by
 * the Calendar view to render the month grid.
 */
export async function getCalendarMonthData(
  userId: string,
  month: number,
  year: number,
): Promise<
  Map<string, { income: number; expense: number; count: number }>
> {
  const supabase = await createClient();
  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("ledgers")
    .select("id");
  // RLS scopes to ledgers the user is a member of (owned or shared).
  if (ledgerError) throw new Error(ledgerError.message);
  const ledgerIds = (ledgerRows ?? []).map((l) => l.id as string);
  if (ledgerIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, type, txn_date")
    .in("ledger_id", ledgerIds)
    .gte("txn_date", firstDayOfMonth(year, month))
    .lte("txn_date", lastDayOfMonth(year, month));
  if (error) throw new Error(error.message);

  const map = new Map<
    string,
    { income: number; expense: number; count: number }
  >();
  for (const row of (data ?? []) as Array<{
    amount: string;
    type: string;
    txn_date: string;
  }>) {
    const value = parseFloat(row.amount);
    if (!Number.isFinite(value)) continue;
    const entry = map.get(row.txn_date) ?? {
      income: 0,
      expense: 0,
      count: 0,
    };
    if (row.type === "income") entry.income += value;
    else if (row.type === "expense") entry.expense += value;
    entry.count += 1;
    map.set(row.txn_date, entry);
  }
  return map;
}

/**
 * Fetch transactions that occurred on a single calendar date (across all
 * ledgers for the user). Used by the Calendar day drawer.
 */
export async function getTransactionsByDate(
  userId: string,
  ymd: string,
): Promise<Transaction[]> {
  const supabase = await createClient();
  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("ledgers")
    .select("id");
  // RLS scopes to ledgers the user is a member of (owned or shared).
  if (ledgerError) throw new Error(ledgerError.message);
  const ledgerIds = (ledgerRows ?? []).map((l) => l.id as string);
  if (ledgerIds.length === 0) return [];

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
    .eq("txn_date", ymd)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Transaction[];
}

/**
 * Daily expense totals for a user over an inclusive date range.
 * Returns a map of YYYY-MM-DD → total expense (in the range).
 * Days with no expenses are omitted.
 */
export async function getDailyExpenseTotals(
  userId: string,
  startIso: string,
  endIso: string,
): Promise<Map<string, number>> {
  const supabase = await createClient();
  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("ledgers")
    .select("id");
  // RLS scopes to ledgers the user is a member of (owned or shared).
  if (ledgerError) throw new Error(ledgerError.message);
  const ledgerIds = (ledgerRows ?? []).map((l) => l.id as string);
  if (ledgerIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, txn_date")
    .in("ledger_id", ledgerIds)
    .eq("type", "expense")
    .gte("txn_date", startIso)
    .lte("txn_date", endIso);
  if (error) throw new Error(error.message);

  const totals = new Map<string, number>();
  for (const row of (data ?? []) as Array<{
    amount: string;
    txn_date: string;
  }>) {
    const value = parseFloat(row.amount);
    if (!Number.isFinite(value)) continue;
    totals.set(row.txn_date, (totals.get(row.txn_date) ?? 0) + value);
  }
  return totals;
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
    .select("id");
  // RLS scopes to ledgers the user is a member of (owned or shared).
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

/**
 * Returns the user's recent expense transactions across every ledger,
 * joined with category metadata. Used by subscription detection.
 */
export async function getRecentExpensesForUser(
  userId: string,
  days = 120,
): Promise<Transaction[]> {
  const supabase = await createClient();

  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("ledgers")
    .select("id");
  // RLS scopes to ledgers the user is a member of (owned or shared).
  if (ledgerError) throw new Error(ledgerError.message);
  const ledgerIds = (ledgerRows ?? []).map((l) => l.id as string);
  if (ledgerIds.length === 0) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

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
    .eq("type", "expense")
    .gte("txn_date", cutoffIso)
    .order("txn_date", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Transaction[];
}

/** Active recurring rules across every ledger the user owns. */
export async function getActiveRecurringRules(
  userId: string,
): Promise<RecurringRule[]> {
  const supabase = await createClient();

  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("ledgers")
    .select("id");
  // RLS scopes to ledgers the user is a member of (owned or shared).
  if (ledgerError) throw new Error(ledgerError.message);
  const ledgerIds = (ledgerRows ?? []).map((l) => l.id as string);
  if (ledgerIds.length === 0) return [];

  const { data, error } = await supabase
    .from("recurring_rules")
    .select("*")
    .in("ledger_id", ledgerIds)
    .eq("is_active", true);

  if (error) throw new Error(error.message);
  return (data ?? []) as RecurringRule[];
}

/** Active savings goals for the user, newest first. */
export async function getSavingsGoals(userId: string): Promise<SavingsGoal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("savings_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SavingsGoal[];
}

/**
 * Aggregate stats for a "year-in-review" card: totals, top categories, the
 * biggest single-day spend, count of transactions. Operates across every
 * ledger the user owns. Returns null if the user has no data for the year.
 */
export interface YearInReview {
  year: number;
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  savingsRate: number; // 0–100, clamped
  txnCount: number;
  topCategories: { name: string; icon: string; color: string; total: number }[];
  biggestDay: { date: string; total: number } | null;
  biggestExpense: { note: string | null; categoryName: string; amount: number } | null;
  monthlyAvg: number;
  activeMonths: number;
}

export async function getYearInReview(
  userId: string,
  year: number,
): Promise<YearInReview | null> {
  const supabase = await createClient();

  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("ledgers")
    .select("id");
  // RLS scopes to ledgers the user is a member of (owned or shared).
  if (ledgerError) throw new Error(ledgerError.message);
  const ledgerIds = (ledgerRows ?? []).map((l) => l.id as string);
  if (ledgerIds.length === 0) return null;

  const start = `${year}-01-01`;
  const end = `${year}-12-31`;

  const { data, error } = await supabase
    .from("transactions")
    .select(
      `
      amount, type, txn_date, note, category_id,
      category:categories ( id, name, icon, color )
      `,
    )
    .in("ledger_id", ledgerIds)
    .gte("txn_date", start)
    .lte("txn_date", end);

  if (error) throw new Error(error.message);
  type Row = {
    amount: string;
    type: string;
    txn_date: string;
    note: string | null;
    category_id: string | null;
    category:
      | { id: string; name: string; icon: string | null; color: string | null }
      | { id: string; name: string; icon: string | null; color: string | null }[]
      | null;
  };
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return null;

  let totalIncome = 0;
  let totalExpense = 0;
  const byCategory = new Map<
    string,
    { name: string; icon: string; color: string; total: number }
  >();
  const byDay = new Map<string, number>();
  const monthsActive = new Set<string>();
  let biggestExpense: YearInReview["biggestExpense"] = null;

  for (const r of rows) {
    const amt = parseFloat(r.amount);
    if (!Number.isFinite(amt)) continue;
    monthsActive.add(r.txn_date.slice(0, 7));
    if (r.type === "income") totalIncome += amt;
    else if (r.type === "expense") {
      totalExpense += amt;
      const cat = Array.isArray(r.category) ? r.category[0] : r.category;
      const id = cat?.id ?? r.category_id ?? "uncategorised";
      const name = cat?.name ?? "Uncategorised";
      const icon = cat?.icon ?? "📦";
      const color = cat?.color ?? "#6B7280";
      const slot = byCategory.get(id);
      if (slot) slot.total += amt;
      else byCategory.set(id, { name, icon, color, total: amt });

      byDay.set(r.txn_date, (byDay.get(r.txn_date) ?? 0) + amt);

      if (!biggestExpense || amt > biggestExpense.amount) {
        biggestExpense = {
          note: r.note,
          categoryName: name,
          amount: amt,
        };
      }
    }
  }

  const topCategories = Array.from(byCategory.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  let biggestDay: YearInReview["biggestDay"] = null;
  for (const [date, total] of byDay) {
    if (!biggestDay || total > biggestDay.total) biggestDay = { date, total };
  }

  const netFlow = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? Math.max(0, Math.min(100, (netFlow / totalIncome) * 100)) : 0;
  const activeMonths = monthsActive.size;
  const monthlyAvg = activeMonths > 0 ? totalExpense / activeMonths : 0;

  return {
    year,
    totalIncome,
    totalExpense,
    netFlow,
    savingsRate,
    txnCount: rows.length,
    topCategories,
    biggestDay,
    biggestExpense,
    monthlyAvg,
    activeMonths,
  };
}
