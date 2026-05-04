// Types matching the FlowTrace Postgres schema (supabase/schema.sql).
// Numeric(12,2) values come back from Supabase as strings — keep them as
// strings here and parseFloat() at the call site.

export type LedgerType = "personal" | "investment" | "business";
export type LedgerRole = "owner" | "editor" | "viewer";
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

export interface LedgerMember {
  ledger_id: string;
  user_id: string;
  role: LedgerRole;
  invited_by: string | null;
  joined_at: string;
}

export interface LedgerMemberWithProfile extends LedgerMember {
  email: string | null;
  full_name: string | null;
}

export interface LedgerWithMembership extends Ledger {
  role: LedgerRole;
  member_count: number;
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
  // Joined ledger, when fetched via cross-ledger queries
  ledger?: Pick<Ledger, "id" | "name" | "icon"> | null;
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

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string | null;
  target_amount: string; // numeric(12,2)
  current_amount: string; // numeric(12,2)
  target_date: string | null; // YYYY-MM-DD
  is_active: boolean;
  created_at: string;
}

export interface MonthlyFlow {
  month: number;
  year: number;
  income: number;
  expense: number;
}

export interface GroupedTransactions {
  date: string; // YYYY-MM-DD
  label: string; // "Today" | "Yesterday" | "Mon, 7 Apr"
  transactions: Transaction[];
}

export interface CategoryTotal {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  total: number;
  percentage: number;
}

export interface AnomalyItem {
  categoryName: string;
  currentSpend: number;
  average: number;
  percentageOver: number;
}

export interface ExtractedReceipt {
  amount: number | null;
  merchant: string | null;
  date: string | null;
  category: string | null;
  paymentMethod: string | null;
  note: string | null;
  confidence: "high" | "medium" | "low";
  rawText: string | null;
  error?: string;
}

export interface MonthlyReport {
  id: string;
  userId: string;
  year: number;
  month: number;
  totalIncome: number;
  totalExpense: number;
  netFlow: number;
  categoryBreakdown: CategoryTotal[];
  anomalies: AnomalyItem[];
  generatedAt: string;
}

export interface BudgetWithCategory extends Budget {
  category: Pick<Category, "id" | "name" | "icon" | "color"> | null;
}

export interface CategoryBudgetItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  budgetId: string | null;
  budgetLimit: number | null; // null = no budget set
  currentSpend: number;
  percentage: number; // currentSpend / budgetLimit * 100, capped at 999
}
