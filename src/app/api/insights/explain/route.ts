import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getCategoryBudgetOverview,
  getCategoryMonthlyBreakdown,
  getDashboardSummary,
} from "@/lib/supabase/queries";
import {
  isAiConfigured,
  streamSpendingExplanation,
  type ExplanationContext,
} from "@/lib/ai";

// OpenAI SDK uses node streams.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAILY_LIMIT = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TOP_CATEGORY_LIMIT = 6;

export async function POST(req: Request) {
  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "AI insights are not configured on this server." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Rate limit: rolling 24-hour window per user.
  const since = new Date(Date.now() - MS_PER_DAY).toISOString();
  const { count, error: countError } = await supabase
    .from("ai_explanations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", since);
  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 });
  }
  if ((count ?? 0) >= DAILY_LIMIT) {
    return NextResponse.json(
      {
        error: `Daily limit reached (${DAILY_LIMIT} per 24 h). Try again later.`,
      },
      { status: 429 },
    );
  }

  // Resolve target month: default to current; allow override via JSON body.
  let body: { month?: number; year?: number; currency?: string } = {};
  try {
    body = await req.json();
  } catch {
    // body is optional
  }
  const now = new Date();
  const month = clampMonth(body.month ?? now.getMonth() + 1);
  const year = clampYear(body.year ?? now.getFullYear());
  const currency = body.currency ?? "MYR";

  const prevDate = new Date(year, month - 2, 1);
  const prevMonth = prevDate.getMonth() + 1;
  const prevYear = prevDate.getFullYear();

  const [summary, current, previous, budgets] = await Promise.all([
    getDashboardSummary(user.id),
    getCategoryMonthlyBreakdown(user.id, month, year),
    getCategoryMonthlyBreakdown(user.id, prevMonth, prevYear),
    getCategoryBudgetOverview(user.id, month, year),
  ]);

  const totalIncome = summary.currentMonth.income;
  const totalExpense = summary.currentMonth.expense;
  const previousMonthExpense = previous.reduce((s, c) => s + c.total, 0);

  const previousMap = new Map(previous.map((c) => [c.categoryId, c.total]));
  const topCategories = current.slice(0, TOP_CATEGORY_LIMIT).map((c) => ({
    name: c.name,
    total: c.total,
    sharePct: c.percentage,
    monthOverMonthDelta: c.total - (previousMap.get(c.categoryId) ?? 0),
  }));

  const activeBudgets = budgets
    .filter((b) => b.budgetLimit !== null)
    .map((b) => ({
      name: b.categoryName,
      limit: b.budgetLimit ?? 0,
      spent: b.currentSpend,
      pctUsed: b.percentage,
    }));

  // Days into month: if requesting current month use today, else use the
  // full month (i.e. the analysis covers a completed month).
  const isCurrentMonth =
    month === now.getMonth() + 1 && year === now.getFullYear();
  const daysIntoMonth = isCurrentMonth
    ? now.getDate()
    : daysInMonth(year, month);
  const daysInPreviousMonth = daysInMonth(prevYear, prevMonth);

  const ctx: ExplanationContext = {
    month,
    year,
    daysIntoMonth,
    daysInPreviousMonth,
    currency,
    totals: {
      income: totalIncome,
      expense: totalExpense,
      netFlow: totalIncome - totalExpense,
      previousMonthExpense,
    },
    topCategories,
    budgets: activeBudgets,
  };

  const encoder = new TextEncoder();
  const userId = user.id;

  const webStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const generator = streamSpendingExplanation(ctx);
        let usage = {
          inputTokens: 0,
          outputTokens: 0,
          cacheReadTokens: 0,
        };
        while (true) {
          const next = await generator.next();
          if (next.done) {
            usage = next.value;
            break;
          }
          controller.enqueue(encoder.encode(next.value));
        }

        // Audit + rate-limit accounting. Best-effort — don't fail the
        // response if logging breaks.
        try {
          await supabase.from("ai_explanations").insert({
            user_id: userId,
            month,
            year,
            input_tokens: usage.inputTokens,
            output_tokens: usage.outputTokens,
            cache_read_tokens: usage.cacheReadTokens,
          });
        } catch {
          // ignore — logging failure shouldn't kill the response
        }

        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "stream error";
        controller.enqueue(encoder.encode(`\n\n[error: ${msg}]`));
        controller.close();
      }
    },
  });

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

function clampMonth(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(12, Math.max(1, Math.floor(n)));
}

function clampYear(n: number): number {
  if (!Number.isFinite(n)) return new Date().getFullYear();
  return Math.min(2100, Math.max(2000, Math.floor(n)));
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
