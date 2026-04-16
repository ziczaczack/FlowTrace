// Pure functions for computing actionable insights from dashboard data.
// No Supabase calls here — feed it aggregates and it returns an Insight[].

import type { CategoryBudgetItem, CategoryTotal } from "@/types/database";

export type InsightTone = "positive" | "neutral" | "warning" | "negative";
export type InsightIcon = "pace" | "surge" | "budget" | "streak";

export interface Insight {
  id: string;
  tone: InsightTone;
  icon: InsightIcon;
  title: string;
  detail: string;
}

export interface InsightContext {
  currentMonthExpense: number;
  previousMonthExpense: number;
  daysIntoMonth: number;
  daysInPreviousMonth: number;
  currentByCategory: CategoryTotal[];
  previousByCategory: CategoryTotal[];
  budgetItems: CategoryBudgetItem[];
}

const MYR = (n: number) =>
  n.toLocaleString("en-MY", { style: "currency", currency: "MYR" });

export function computeInsights(ctx: InsightContext): Insight[] {
  const insights: Insight[] = [];

  // 1. Pace vs last month's average daily spend.
  if (ctx.previousMonthExpense > 0 && ctx.daysInPreviousMonth > 0) {
    const lastAvgPerDay = ctx.previousMonthExpense / ctx.daysInPreviousMonth;
    const expectedSoFar = lastAvgPerDay * ctx.daysIntoMonth;
    if (expectedSoFar > 0) {
      const delta = ctx.currentMonthExpense - expectedSoFar;
      const pct = Math.round((Math.abs(delta) / expectedSoFar) * 100);
      if (pct >= 5) {
        insights.push({
          id: "pace",
          icon: "pace",
          tone: delta > 0 ? "warning" : "positive",
          title:
            delta > 0
              ? `${pct}% ahead of last month's pace`
              : `${pct}% below last month's pace`,
          detail:
            delta > 0
              ? `Day ${ctx.daysIntoMonth}: spent ${MYR(ctx.currentMonthExpense)} vs ${MYR(expectedSoFar)} expected`
              : `Day ${ctx.daysIntoMonth}: only ${MYR(ctx.currentMonthExpense)} spent — ${MYR(Math.abs(delta))} under the expected pace`,
        });
      }
    }
  }

  // 2. Category with the biggest absolute increase vs last month.
  if (ctx.currentByCategory.length > 0 && ctx.previousByCategory.length > 0) {
    const prevMap = new Map(
      ctx.previousByCategory.map((c) => [c.categoryId, c.total]),
    );
    let top: {
      id: string;
      name: string;
      icon: string;
      delta: number;
      prev: number;
    } | null = null;
    for (const c of ctx.currentByCategory) {
      const prev = prevMap.get(c.categoryId) ?? 0;
      const delta = c.total - prev;
      if (delta > 0 && (!top || delta > top.delta)) {
        top = { id: c.categoryId, name: c.name, icon: c.icon, delta, prev };
      }
    }
    if (top && top.delta > 10) {
      const pct =
        top.prev > 0
          ? Math.round((top.delta / top.prev) * 100)
          : null;
      insights.push({
        id: `surge-${top.id}`,
        icon: "surge",
        tone: "neutral",
        title: `${top.icon} ${top.name} up ${MYR(top.delta)}`,
        detail:
          pct !== null
            ? `+${pct}% vs last month`
            : `New spending in this category`,
      });
    }
  }

  // 3. Budget alerts: highest-utilisation category over 80%.
  const hottest = ctx.budgetItems
    .filter((b) => b.budgetLimit !== null && b.percentage >= 80)
    .sort((a, b) => b.percentage - a.percentage)[0];
  if (hottest && hottest.budgetLimit !== null) {
    const over = hottest.percentage >= 100;
    insights.push({
      id: `budget-${hottest.categoryId}`,
      icon: "budget",
      tone: over ? "negative" : "warning",
      title: over
        ? `${hottest.categoryIcon ?? "⚠️"} ${hottest.categoryName} is over budget`
        : `${hottest.categoryIcon ?? "⚠️"} ${hottest.categoryName} near budget`,
      detail: `${Math.round(hottest.percentage)}% used · ${MYR(hottest.currentSpend)} of ${MYR(hottest.budgetLimit)}`,
    });
  }

  // 4. Savings positive note — only if none of the above fired and month is positive.
  if (insights.length === 0 && ctx.currentMonthExpense > 0) {
    insights.push({
      id: "steady",
      icon: "streak",
      tone: "positive",
      title: "Steady spending",
      detail: `You've spent ${MYR(ctx.currentMonthExpense)} this month — nothing unusual to flag`,
    });
  }

  return insights.slice(0, 3);
}
