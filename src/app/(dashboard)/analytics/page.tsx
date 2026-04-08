import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCategoryMonthlyBreakdown,
  getCurrentVsPreviousMonth,
  getLast12MonthsFlow,
} from "@/lib/supabase/queries";
import {
  generateMonthlyReport,
  getReportFor,
} from "@/lib/reports";
import { MonthlyReportCard } from "@/components/analytics/monthly-report-card";
import { ComparisonBarChart } from "@/components/charts/comparison-bar-chart";
import { CategoryBreakdown } from "@/components/analytics/category-breakdown";
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

  const [annualFlow, comparison, breakdown] = await Promise.all([
    getLast12MonthsFlow(user.id),
    getCurrentVsPreviousMonth(user.id),
    getCategoryMonthlyBreakdown(user.id, currentMonth, currentYear),
  ]);

  // Try to use the cached report for last month; if missing, generate it
  // server-side so the page renders with data on the first paint.
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
  // Previous-previous month for the "vs prev" delta on the report card.
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
