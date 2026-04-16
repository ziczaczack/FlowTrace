import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCategoryBudgetOverview,
  getCategoryMonthlyBreakdown,
  getCurrentMonthByCategory,
  getDashboardSummary,
  getOrCreateDefaultLedger,
  getTransactions,
} from "@/lib/supabase/queries";
import { computeInsights } from "@/lib/insights";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { SmartInsights } from "@/components/dashboard/smart-insights";
import { NetFlowChart } from "@/components/charts/net-flow-chart";
import { CategoryDonutChart } from "@/components/charts/category-donut-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { EmptyState } from "@/components/dashboard/empty-state";
import { UserMenu } from "@/components/dashboard/user-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { DashboardFab } from "./dashboard-client";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function firstName(user: {
  user_metadata?: Record<string, unknown>;
  email?: string | null;
}): string {
  const meta = user.user_metadata ?? {};
  const fullName =
    (meta.full_name as string | undefined) ?? (meta.name as string | undefined);
  if (fullName) return fullName.split(/\s+/)[0];
  if (user.email) return user.email.split("@")[0];
  return "there";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ledger = await getOrCreateDefaultLedger(user.id);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const prevDate = new Date(currentYear, currentMonth - 2, 1);
  const prevMonth = prevDate.getMonth() + 1;
  const prevYear = prevDate.getFullYear();
  const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

  const [summary, byCategory, monthTxns, prevByCategory, budgetItems] =
    await Promise.all([
      getDashboardSummary(user.id),
      getCurrentMonthByCategory(user.id),
      getTransactions(ledger.id, currentMonth, currentYear),
      getCategoryMonthlyBreakdown(user.id, prevMonth, prevYear),
      getCategoryBudgetOverview(user.id, currentMonth, currentYear),
    ]);

  const previousMonthExpense = summary.last6Months.find(
    (m) => m.month === prevMonth && m.year === prevYear,
  )?.expense ?? 0;

  const insights = computeInsights({
    currentMonthExpense: summary.currentMonth.expense,
    previousMonthExpense,
    daysIntoMonth: now.getDate(),
    daysInPreviousMonth: daysInPrevMonth,
    currentByCategory: byCategory,
    previousByCategory: prevByCategory,
    budgetItems,
  });

  const lifetimeFlow =
    summary.totalBalance !== 0 ||
    summary.last6Months.some((m) => m.income > 0 || m.expense > 0);
  const isEmpty = !lifetimeFlow && monthTxns.length === 0;

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-subtle-foreground">
              {todayLabel()}
            </p>
            <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">
              {greeting()},{" "}
              <span className="text-primary">{firstName(user)}</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="md:hidden">
              <ThemeToggle />
            </div>
            <UserMenu email={user.email ?? ""} fullName={fullName} />
          </div>
        </header>

        {isEmpty ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-5">
            <SummaryCards
              totalBalance={summary.totalBalance}
              income={summary.currentMonth.income}
              expense={summary.currentMonth.expense}
              net={summary.currentMonth.net}
            />
            <SmartInsights insights={insights} />
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <NetFlowChart data={summary.last6Months} />
              <CategoryDonutChart data={byCategory} />
            </div>
            <RecentTransactions transactions={monthTxns} />
          </div>
        )}
      </div>

      <DashboardFab ledgerId={ledger.id} />
    </div>
  );
}
