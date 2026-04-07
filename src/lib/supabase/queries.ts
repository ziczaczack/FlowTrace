// Server-side query helpers for FlowTrace.
// All functions in this file MUST be called from a Server Component, Route
// Handler, or Server Action — never from client code.

import { createClient } from "@/lib/supabase/server";
import type { Category, Ledger, Transaction } from "@/types/database";
import type { NewTransaction } from "@/types/forms";

/**
 * Returns the user's default ledger, creating one ("My Wallet") on first call.
 */
export async function getOrCreateDefaultLedger(userId: string): Promise<Ledger> {
  const supabase = await createClient();

  const { data: existing, error: selectError } = await supabase
    .from("ledgers")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();

  if (selectError) throw new Error(selectError.message);
  if (existing) return existing as Ledger;

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
