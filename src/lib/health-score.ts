// Composite "financial health" score for the dashboard widget.
//
// Breakdown (0–100):
//   • Savings Rate       (0–40)  how much of income is retained
//   • Budget Adherence   (0–35)  % of budgets at <=100% utilisation
//   • Category Diversity (0–25)  how evenly spend is distributed — signals
//                                that one category isn't dominating
//
// Every component returns both a raw score and a human-friendly reason,
// so the UI can render a breakdown on hover/click.

import type { CategoryBudgetItem, CategoryTotal } from "@/types/database";

export interface HealthComponent {
  key: "savings" | "budget" | "diversity";
  label: string;
  score: number; // 0–max
  max: number;
  detail: string;
}

export interface HealthScore {
  score: number; // 0–100
  rating: "excellent" | "strong" | "fair" | "needs-attention" | "critical";
  headline: string;
  components: HealthComponent[];
  nextAction: string | null;
}

interface Input {
  income: number;
  expense: number;
  budgetItems: CategoryBudgetItem[];
  currentByCategory: CategoryTotal[];
}

function scoreSavings(income: number, expense: number): HealthComponent {
  const max = 40;
  if (income <= 0) {
    return {
      key: "savings",
      label: "Savings rate",
      score: 0,
      max,
      detail: "No income logged this month — can't compute a savings rate yet.",
    };
  }
  const saved = income - expense;
  const rate = saved / income;
  // 20%+ savings rate → full marks; 0% → 0; negative → 0.
  let score = 0;
  if (rate >= 0.2) score = max;
  else if (rate >= 0) score = Math.round((rate / 0.2) * max);
  else score = 0;

  const pct = Math.round(rate * 100);
  const detail =
    rate >= 0.2
      ? `Outstanding — you're saving ${pct}% of income.`
      : rate >= 0.1
        ? `Solid — you're saving ${pct}% of income. Target is 20%.`
        : rate >= 0
          ? `You're saving ${pct}% of income. Try to lift that toward 10–20%.`
          : `You spent more than you earned (${pct}%). Trim one category this week.`;

  return { key: "savings", label: "Savings rate", score, max, detail };
}

function scoreBudget(items: CategoryBudgetItem[]): HealthComponent {
  const max = 35;
  const tracked = items.filter((i) => i.budgetLimit !== null);
  if (tracked.length === 0) {
    return {
      key: "budget",
      label: "Budget adherence",
      score: Math.round(max * 0.55), // neutral score for users without budgets
      max,
      detail: "No budgets set yet. Add one in Settings → Budgets for a better score.",
    };
  }
  const onTrack = tracked.filter((i) => i.percentage <= 100).length;
  const overBy = tracked.filter((i) => i.percentage > 100);
  const ratio = onTrack / tracked.length;
  const score = Math.round(ratio * max);

  const worst = overBy.sort((a, b) => b.percentage - a.percentage)[0];
  const detail =
    overBy.length === 0
      ? `All ${tracked.length} budget${tracked.length > 1 ? "s" : ""} on track.`
      : `${overBy.length} of ${tracked.length} budget${tracked.length > 1 ? "s" : ""} over limit` +
        (worst
          ? ` — ${worst.categoryName} is at ${Math.round(worst.percentage)}%.`
          : ".");

  return { key: "budget", label: "Budget adherence", score, max, detail };
}

function scoreDiversity(byCategory: CategoryTotal[]): HealthComponent {
  const max = 25;
  if (byCategory.length === 0) {
    return {
      key: "diversity",
      label: "Spending diversity",
      score: Math.round(max * 0.5),
      max,
      detail: "Not enough spending data yet.",
    };
  }
  // Herfindahl-style concentration: sum of squared shares, 0 = diverse, 1 = one-category.
  const total = byCategory.reduce((s, c) => s + c.total, 0);
  if (total <= 0) {
    return {
      key: "diversity",
      label: "Spending diversity",
      score: Math.round(max * 0.5),
      max,
      detail: "Not enough spending data yet.",
    };
  }
  const hhi = byCategory.reduce((s, c) => {
    const share = c.total / total;
    return s + share * share;
  }, 0);
  // hhi=1 → one category (score 0); hhi~0.25 → 4 evenly split categories (score ~max).
  // Transform: lower hhi = higher score.
  const raw = Math.max(0, 1 - (hhi - 0.2) / 0.6);
  const score = Math.round(Math.min(1, raw) * max);

  const top = byCategory[0];
  const topShare = Math.round((top.total / total) * 100);
  const detail =
    score >= max * 0.85
      ? `Nicely balanced — ${byCategory.length} active categories, ${top.name} leads at ${topShare}%.`
      : score >= max * 0.5
        ? `${top.name} is ${topShare}% of spend. Not bad, but watch concentration.`
        : `${top.name} dominates at ${topShare}% of spend — consider diversifying.`;

  return { key: "diversity", label: "Spending diversity", score, max, detail };
}

function ratingFor(score: number): HealthScore["rating"] {
  if (score >= 85) return "excellent";
  if (score >= 70) return "strong";
  if (score >= 50) return "fair";
  if (score >= 30) return "needs-attention";
  return "critical";
}

export function computeHealthScore(input: Input): HealthScore {
  const components = [
    scoreSavings(input.income, input.expense),
    scoreBudget(input.budgetItems),
    scoreDiversity(input.currentByCategory),
  ];
  const total = components.reduce((s, c) => s + c.score, 0);
  const rating = ratingFor(total);

  const headlineByRating: Record<HealthScore["rating"], string> = {
    excellent: "Your finances are humming.",
    strong: "Looking healthy this month.",
    fair: "Steady — room to tighten up.",
    "needs-attention": "A few things need a look.",
    critical: "Time to re-anchor the plan.",
  };

  // Surface the weakest component as the next action, unless it's neutral.
  const weakest = [...components]
    .filter((c) => c.max > 0)
    .sort((a, b) => a.score / a.max - b.score / b.max)[0];

  return {
    score: total,
    rating,
    headline: headlineByRating[rating],
    components,
    nextAction: weakest ? weakest.detail : null,
  };
}
