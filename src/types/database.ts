// Types matching the FlowTrace Postgres schema (supabase/schema.sql).
// Numeric(12,2) values come back from Supabase as strings — keep them as
// strings here and parseFloat() at the call site.

export type LedgerType = "personal" | "investment" | "business";
export type CategoryType = "income" | "expense";
export type TransactionType = "income" | "expense" | "transfer";
export type PaymentMethod = "cash" | "card" | "e-wallet" | "bank_transfer";
export type RecurringFrequency = "daily" | "weekly" | "monthly" | "yearly";
export type BudgetPeriod = "monthly";

export interface Ledger {
  id: string;
  user_id: string;
  name: string;
  type: LedgerType;
  currency: string;
  icon: string | null;
  is_default: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  type: CategoryType;
  created_at: string;
}

export interface Transaction {
  id: string;
  ledger_id: string;
  category_id: string | null;
  recurring_rule_id: string | null;
  transfer_pair_id: string | null;
  amount: string; // numeric(12,2)
  type: TransactionType;
  payment_method: PaymentMethod | null;
  note: string | null;
  txn_date: string; // YYYY-MM-DD
  created_at: string;
  // Joined category, when fetched via getTransactions()
  category?: Pick<Category, "id" | "name" | "icon" | "color"> | null;
}

export interface RecurringRule {
  id: string;
  ledger_id: string;
  category_id: string | null;
  name: string;
  amount: string;
  frequency: RecurringFrequency;
  day_of_month: number | null;
  next_due: string;
  is_active: boolean;
  created_at: string;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  amount_limit: string;
  period: BudgetPeriod;
  created_at: string;
}

export interface MonthlyReport {
  id: string;
  user_id: string;
  year: number;
  month: number;
  total_income: string | null;
  total_expense: string | null;
  net_flow: string | null;
  category_breakdown: unknown;
  anomalies: unknown;
  generated_at: string;
}
