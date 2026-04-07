import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentMonthByCategory,
  getDashboardSummary,
  getOrCreateDefaultLedger,
  getTransactions,
} from "@/lib/supabase/queries";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { NetFlowChart } from "@/components/charts/net-flow-chart";
import { CategoryDonutChart } from "@/components/charts/category-donut-chart";
import { EmptyState } from "@/components/dashboard/empty-state";
import { UserMenu } from "@/components/dashboard/user-menu";
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
  const [summary, byCategory, monthTxns] = await Promise.all([
    getDashboardSummary(user.id),
    getCurrentMonthByCategory(user.id),
    getTransactions(
      ledger.id,
      new Date().getMonth() + 1,
      new Date().getFullYear(),
    ),
  ]);

  // The dashboard considers itself empty when the user has never recorded
  // a transaction in any timeframe — not just this month.
  const lifetimeFlow =
    summary.totalBalance !== 0 ||
    summary.last6Months.some((m) => m.income > 0 || m.expense > 0);
  const isEmpty = !lifetimeFlow && monthTxns.length === 0;

  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <header className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {greeting()}, {firstName(user)}
            </h1>
            <p className="mt-1 text-sm text-white/50">{todayLabel()}</p>
          </div>
          <UserMenu email={user.email ?? ""} fullName={fullName} />
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
            <NetFlowChart data={summary.last6Months} />
            <CategoryDonutChart data={byCategory} />
          </div>
        )}
      </div>

      <DashboardFab ledgerId={ledger.id} />
    </div>
  );
}
