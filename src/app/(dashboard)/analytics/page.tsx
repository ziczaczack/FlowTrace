import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCategoryMonthlyBreakdown,
  getCategoryBudgetOverview,
  getCurrentVsPreviousMonth,
  getDailyExpenseTotals,
  getLast12MonthsFlow,
} from "@/lib/supabase/queries";
import {
  generateMonthlyReport,
  getReportFor,
} from "@/lib/reports";
import { MonthlyReportCard } from "@/components/analytics/monthly-report-card";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { CategoryBreakdown } from "@/components/analytics/category-breakdown";
import { BudgetOverview } from "@/components/analytics/budget-overview";
import { SpendingHeatmap } from "@/components/analytics/spending-heatmap";
import { AnnualFlowChart } from "@/components/charts/annual-flow-chart";
import { ExportButton } from "@/components/ui/export-button";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const lastMonthDate = new Date(currentYear, currentMonth - 2, 1);
  const lastMonth = lastMonthDate.getMonth() + 1;
  const lastMonthYear = lastMonthDate.getFullYear();
  const prevPrevDate = new Date(currentYear, currentMonth - 3, 1);
  const prevPrevMonth = prevPrevDate.getMonth() + 1;
  const prevPrevYear = prevPrevDate.getFullYear();

  // 91-day (13-week) window for the spending heatmap.
  const heatmapEnd = new Date(currentYear, currentMonth - 1, now.getDate());
  const heatmapStart = new Date(heatmapEnd);
  heatmapStart.setDate(heatmapEnd.getDate() - 90);
  const toIso = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const heatmapStartIso = toIso(heatmapStart);
  const heatmapEndIso = toIso(heatmapEnd);

  const [annualFlow, comparison, breakdown, budgetItems, dailyTotals] =
    await Promise.all([
      getLast12MonthsFlow(user.id),
      getCurrentVsPreviousMonth(user.id),
      getCategoryMonthlyBreakdown(user.id, currentMonth, currentYear),
      getCategoryBudgetOverview(user.id, currentMonth, currentYear),
      getDailyExpenseTotals(user.id, heatmapStartIso, heatmapEndIso),
    ]);

  // Build a dense array of every day in the window (oldest → newest).
  const heatmapData: { date: string; amount: number }[] = [];
  {
    const cursor = new Date(heatmapStart);
    while (cursor <= heatmapEnd) {
      const iso = toIso(cursor);
      heatmapData.push({ date: iso, amount: dailyTotals.get(iso) ?? 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  let lastReport = await getReportFor(user.id, lastMonthYear, lastMonth);
  if (!lastReport) {
    try {
      lastReport = await generateMonthlyReport(
        user.id,
        lastMonthYear,
        lastMonth,
      );
    } catch {
      lastReport = null;
    }
  }
  const prevPrevReport = await getReportFor(
    user.id,
    prevPrevYear,
    prevPrevMonth,
  );

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Analytics
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Deeper insights into your spending
            </p>
          </div>
          <ExportButton month={currentMonth} year={currentYear} />
        </header>

        <div className="flex flex-col gap-5">
          <MonthlyReportCard
            report={lastReport}
            previousReport={prevPrevReport}
          />
          <SpendingHeatmap data={heatmapData} />
          <BudgetOverview items={budgetItems} />
          <ComparisonBarChart data={comparison} />
          <CategoryBreakdown
            initialData={breakdown}
            initialMonth={currentMonth}
            initialYear={currentYear}
            accountCreatedAt={user.created_at}
          />
          <AnnualFlowChart data={annualFlow} />
        </div>
      </div>
    </div>
  );
}
