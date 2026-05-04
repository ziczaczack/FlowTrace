// Monthly report generation. Aggregates a user's transactions for a given
// month, computes category breakdowns + anomaly flags, and upserts the
// result into monthly_reports for cheap re-reads.

import { createClient } from "@/lib/supabase/server";
import type {
  AnomalyItem,
  CategoryTotal,
  MonthlyReport,
} from "@/types/database";

function firstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}
function lastDayOfMonth(year: number, month: number): string {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

type RawRow = {
  amount: string;
  type: string;
  txn_date: string;
  category_id: string | null;
  category:
    | { id: string; name: string; icon: string | null; color: string | null }
    | { id: string; name: string; icon: string | null; color: string | null }[]
    | null;
};

function flattenCategory(row: RawRow) {
  return Array.isArray(row.category) ? row.category[0] : row.category;
}

/**
 * Generates (or regenerates) a MonthlyReport row for the user, returning
 * the camelCase in-app shape.
 */
export async function generateMonthlyReport(
  userId: string,
  year: number,
  month: number,
): Promise<MonthlyReport> {
  const supabase = await createClient();

  // 1. Resolve the user's ledger ids. RLS scopes to ledgers the user is a
  //    member of (owned or shared).
  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("ledgers")
    .select("id");
  if (ledgerError) throw new Error(ledgerError.message);
  const ledgerIds = (ledgerRows ?? []).map((l) => l.id as string);

  // 2. Fetch transactions for this month + previous 3 months in one go so we
  //    can compute both the totals and the anomaly baseline together.
  const baselineDate = new Date(year, month - 1 - 3, 1);
  const baselineYear = baselineDate.getFullYear();
  const baselineMonth = baselineDate.getMonth() + 1;
  const start = firstDayOfMonth(baselineYear, baselineMonth);
  const end = lastDayOfMonth(year, month);

  let txnRows: RawRow[] = [];
  if (ledgerIds.length > 0) {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        `
        amount, type, txn_date, category_id,
        category:categories ( id, name, icon, color )
        `,
      )
      .in("ledger_id", ledgerIds)
      .gte("txn_date", start)
      .lte("txn_date", end);
    if (error) throw new Error(error.message);
    txnRows = (data ?? []) as unknown as RawRow[];
  }

  // 3. Split rows into "this month" vs "baseline (prev 3 months)".
  let totalIncome = 0;
  let totalExpense = 0;
  const currentTotals = new Map<string, CategoryTotal>();
  // category_id -> array of monthly totals for the previous 3 months
  const previousTotals = new Map<string, Map<string, number>>();

  for (const row of txnRows) {
    const value = parseFloat(row.amount);
    if (!Number.isFinite(value)) continue;

    const [yStr, mStr] = row.txn_date.split("-");
    const ty = Number(yStr);
    const tm = Number(mStr);
    const isCurrent = ty === year && tm === month;

    if (isCurrent) {
      if (row.type === "income") totalIncome += value;
      else if (row.type === "expense") totalExpense += value;
    }

    if (row.type !== "expense") continue;
    const cat = flattenCategory(row);
    const id = cat?.id ?? row.category_id ?? "uncategorised";
    const name = cat?.name ?? "Uncategorised";
    const icon = cat?.icon ?? "📦";
    const color = cat?.color ?? "#6B7280";

    if (isCurrent) {
      const existing = currentTotals.get(id);
      if (existing) existing.total += value;
      else
        currentTotals.set(id, {
          categoryId: id,
          name,
          icon,
          color,
          total: value,
          percentage: 0,
        });
    } else {
      // Baseline: bucket per (category, monthKey)
      const key = `${ty}-${tm}`;
      const monthMap = previousTotals.get(id) ?? new Map<string, number>();
      monthMap.set(key, (monthMap.get(key) ?? 0) + value);
      previousTotals.set(id, monthMap);
    }
  }

  // 4. Top 5 category breakdown for the current month.
  const allCurrent = Array.from(currentTotals.values());
  const grandExpense = allCurrent.reduce((acc, c) => acc + c.total, 0);
  for (const c of allCurrent) {
    c.percentage = grandExpense > 0 ? (c.total / grandExpense) * 100 : 0;
  }
  allCurrent.sort((a, b) => b.total - a.total);
  const top5 = allCurrent.slice(0, 5);

  // 5. Anomaly detection — compare current month to 3-month average.
  const anomalies: AnomalyItem[] = [];
  for (const c of allCurrent) {
    const monthMap = previousTotals.get(c.categoryId);
    // Average over 3 months (treat missing months as 0)
    const sum = monthMap
      ? Array.from(monthMap.values()).reduce((a, b) => a + b, 0)
      : 0;
    const average = sum / 3;
    if (average <= 0) continue;
    if (c.total < 50) continue;
    if (c.total > average * 1.5) {
      anomalies.push({
        categoryName: c.name,
        currentSpend: c.total,
        average,
        percentageOver: ((c.total - average) / average) * 100,
      });
    }
  }
  anomalies.sort((a, b) => b.percentageOver - a.percentageOver);

  // 6. Upsert into monthly_reports.
  const netFlow = totalIncome - totalExpense;
  const { data: upserted, error: upsertError } = await supabase
    .from("monthly_reports")
    .upsert(
      {
        user_id: userId,
        year,
        month,
        total_income: totalIncome,
        total_expense: totalExpense,
        net_flow: netFlow,
        category_breakdown: top5,
        anomalies,
        generated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,year,month" },
    )
    .select("*")
    .single();
  if (upsertError) throw new Error(upsertError.message);

  return {
    id: upserted.id as string,
    userId,
    year,
    month,
    totalIncome,
    totalExpense,
    netFlow,
    categoryBreakdown: top5,
    anomalies,
    generatedAt: upserted.generated_at as string,
  };
}

/**
 * Most recently generated monthly report for a user, or null if there is
 * none. Reads only the row — does not regenerate.
 */
export async function getLatestReport(
  userId: string,
): Promise<MonthlyReport | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monthly_reports")
    .select("*")
    .eq("user_id", userId)
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;
  return rowToReport(data[0]);
}

/**
 * Cached report for a specific (year, month). Returns null if missing.
 */
export async function getReportFor(
  userId: string,
  year: number,
  month: number,
): Promise<MonthlyReport | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("monthly_reports")
    .select("*")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("month", month)
    .limit(1);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;
  return rowToReport(data[0]);
}

function rowToReport(row: Record<string, unknown>): MonthlyReport {
  const num = (v: unknown) => {
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const parsed = parseFloat(v);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };
  return {
    id: row.id as string,
    userId: row.user_id as string,
    year: row.year as number,
    month: row.month as number,
    totalIncome: num(row.total_income),
    totalExpense: num(row.total_expense),
    netFlow: num(row.net_flow),
    categoryBreakdown: (row.category_breakdown as CategoryTotal[]) ?? [],
    anomalies: (row.anomalies as AnomalyItem[]) ?? [],
    generatedAt: row.generated_at as string,
  };
}
