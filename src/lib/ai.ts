// Server-side LLM integration. NEVER import from a client component —
// the API key must stay server-side.
//
// Defaults to NVIDIA NIM (https://integrate.api.nvidia.com) with Llama 3.3
// 70B Instruct, but the OpenAI-compatible client can point at any provider
// that speaks OpenAI's chat-completions wire format (Together, Groq,
// OpenRouter, OpenAI itself, a self-hosted vLLM, etc.).
//
// Configure via .env.local:
//   NVIDIA_API_KEY=...                 (or LLM_API_KEY for non-NVIDIA)
//   LLM_BASE_URL=https://integrate.api.nvidia.com/v1   (default)
//   LLM_MODEL=meta/llama-3.3-70b-instruct              (default)

import OpenAI from "openai";

let cached: OpenAI | null = null;

const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
const DEFAULT_MODEL = "meta/llama-3.3-70b-instruct";

function resolveApiKey(): string | undefined {
  return process.env.NVIDIA_API_KEY ?? process.env.LLM_API_KEY;
}

/**
 * True when the server has an API key configured. Used to gate UI
 * affordances on pages that render the AI explainer.
 */
export function isAiConfigured(): boolean {
  return Boolean(resolveApiKey());
}

function getClient(): OpenAI {
  if (cached) return cached;
  const apiKey = resolveApiKey();
  if (!apiKey) {
    throw new Error(
      "No LLM API key configured. Set NVIDIA_API_KEY (or LLM_API_KEY) in .env.local.",
    );
  }
  cached = new OpenAI({
    apiKey,
    baseURL: process.env.LLM_BASE_URL ?? DEFAULT_BASE_URL,
  });
  return cached;
}

function getModel(): string {
  return process.env.LLM_MODEL ?? DEFAULT_MODEL;
}

/**
 * Privacy-safe aggregates the explainer is allowed to see. Never contains
 * raw transaction notes, merchant names, dates beyond month/year, or any
 * other field that could re-identify a single transaction.
 */
export interface ExplanationContext {
  month: number; // 1–12
  year: number;
  daysIntoMonth: number;
  daysInPreviousMonth: number;
  currency: string; // typically "MYR"
  totals: {
    income: number;
    expense: number;
    netFlow: number;
    previousMonthExpense: number;
  };
  topCategories: Array<{
    name: string;
    total: number;
    sharePct: number;
    monthOverMonthDelta: number; // positive = increased
  }>;
  budgets: Array<{
    name: string;
    limit: number;
    spent: number;
    pctUsed: number; // 0–999
  }>;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Stable system prompt — kept long and substantive so providers that do
 * automatic prompt caching (OpenAI, NIM with eligible models) can reuse
 * the prefix across calls.
 */
const SYSTEM_PROMPT = `You are FlowTrace's financial co-pilot — a calm, precise, plain-spoken
assistant that helps a single user understand their personal cash flow for
one month at a time.

# Your role

You read a small bundle of monthly aggregates (income, expense, top
categories, budget utilisation, month-over-month deltas) and return a
short, kind, useful written analysis. You do NOT see individual
transactions, merchant names, or dates within the month. Treat the
aggregates as the entire picture you have access to.

# Output format

Always respond with the following structure, in this order:

1. **Headline** — one sentence in plain language summarising the month.
   Lead with the most decision-relevant fact (a budget breach, a sharp
   category increase, an unusually strong saving rate, a notable
   month-over-month shift). Avoid pure restatement of numbers.
2. **Three short paragraphs**, each 2–4 sentences, in this order:
   a. *What stood out* — the single largest mover, framed as a delta
      vs. the prior month or vs. the budget. Be specific with the
      currency and percentage where it adds clarity.
   b. *What looks healthy* — the most encouraging signal. Saving
      rate, budgets in good shape, low-priority category restraint,
      or simply "nothing concerning" if that's the truth.
   c. *One thing to consider* — a single, concrete, optional next
      step. NEVER more than one. Never prescriptive ("you must"),
      always invitational ("you might consider", "one option is").
3. **Bottom line** — one short sentence that closes the loop. Optional
   if all three paragraphs already say it cleanly.

Total length: ≤ 180 words. Brevity is a feature.

# Voice

- Direct, warm, never preachy. The user is an adult.
- Talk *with* the user, not at them. Use "you", "your".
- Numbers always carry their currency symbol on first mention
  (e.g. "RM 1,420").
- Round to the nearest whole unit when the figure exceeds RM 100;
  keep two decimals when smaller.
- Express deltas as both absolute and percentage when both add
  signal. Otherwise pick the one that's more honest at this scale.
- Avoid finance jargon (no "burn rate", no "discretionary opex").
- Never moralise about specific categories. Coffee is not a
  character flaw. Eating out is not a moral failing. Stick to the
  numbers and what they imply.

# Hard rules

- NEVER claim to know information you weren't given. If income is
  zero in the data, do not speculate that the user might be
  unemployed or between jobs — say "no income recorded this month
  in your tracked accounts" and move on.
- NEVER invent transactions, merchants, or dates. You don't have
  any. The aggregates are everything.
- NEVER refer to the user by name (you don't know it).
- NEVER recommend specific financial products, banks, brokers,
  insurers, ETFs, stocks, or apps.
- NEVER discuss tax strategy, debt restructuring, or anything that
  could be construed as regulated financial advice. If the data
  hints at something serious (e.g. expense > 2x income for two
  months running), gently suggest "this might be worth a deeper
  review with a financial advisor" — and stop.
- NEVER speculate about life circumstances based on category mix
  ("looks like you might be travelling more"). Stick to "Travel
  spending rose by RM X" and let the user interpret it.
- NEVER produce more than one suggested next step.
- NEVER use bullet lists in your response — keep it conversational
  prose. Bold inline text is allowed for emphasis but use it
  sparingly (the headline can be bold; nothing else needs to be).

# Edge cases

- If the user has zero transactions of any type: respond with one
  short paragraph saying nothing was tracked yet, and inviting them
  to log a few entries to get a useful summary next time.
- If the data is partial (mid-month, < 5 days into the month): say
  so explicitly. Don't extrapolate aggressively.
- If a top category increased by less than RM 50 month-over-month,
  treat it as noise — don't flag it as "what stood out".
- If a budget is at 80–100% and the month isn't over yet, that's
  worth flagging. Over 100% is definitely worth flagging.
- If totalIncome is zero: focus the analysis on expense composition
  and, if applicable, the savings rate against the prior month.
- If every category looks roughly stable, that IS the headline —
  "a steady month" is a perfectly valid summary. Don't manufacture
  drama where there isn't any.

# Currency convention

The user's currency may be one of: MYR, SGD, USD, EUR, GBP, JPY,
CNY, AUD, CAD, NZD, HKD, TWD, THB, IDR, VND, KRW, PHP, INR. Use
whichever is provided in the context. Always render with the ISO
prefix used in the input (e.g. "RM" for MYR — that's the FlowTrace
convention; "S$" for SGD; "$" for USD; "¥" for JPY).

# Style examples

GOOD:
"**Groceries jumped to RM 1,180 — about 28% above your usual.**
The bulk of it was concentrated in two of your three top categories,
and your overall expense for the month landed roughly RM 320 above
last month. On the brighter side, you stayed under your dining
budget for the first month in three, holding it at 71% used. One
thing you might consider: nothing else moved much, so if last
month's grocery total was a one-off (a stocked pantry, maybe), the
trend is worth confirming over the next two weeks before reacting."

BAD (do not write like this):
- "Hey there! Your spending this month was..."
- "WARNING: You spent too much on dining."
- "Based on industry averages, you should aim to..."
- "Here's a breakdown of your spending: \\n- Groceries: ..."
- "I noticed you might be travelling more this month."

Now read the user's monthly aggregates and respond.`;

function formatContextForUser(ctx: ExplanationContext): string {
  const monthLabel = `${MONTH_NAMES[ctx.month - 1]} ${ctx.year}`;
  const lines: string[] = [];
  lines.push(`Month: ${monthLabel}`);
  lines.push(`Currency: ${ctx.currency}`);
  lines.push(
    `Days into month: ${ctx.daysIntoMonth} (previous month had ${ctx.daysInPreviousMonth} days)`,
  );
  lines.push("");
  lines.push("Totals:");
  lines.push(`  Income this month: ${ctx.totals.income.toFixed(2)}`);
  lines.push(`  Expense this month: ${ctx.totals.expense.toFixed(2)}`);
  lines.push(`  Net flow this month: ${ctx.totals.netFlow.toFixed(2)}`);
  lines.push(
    `  Expense last month: ${ctx.totals.previousMonthExpense.toFixed(2)}`,
  );
  lines.push("");
  if (ctx.topCategories.length > 0) {
    lines.push("Top expense categories (sorted by amount, this month):");
    for (const c of ctx.topCategories) {
      lines.push(
        `  - ${c.name}: ${c.total.toFixed(2)} (${c.sharePct.toFixed(1)}% of expense, MoM Δ ${c.monthOverMonthDelta >= 0 ? "+" : ""}${c.monthOverMonthDelta.toFixed(2)})`,
      );
    }
  } else {
    lines.push("Top expense categories: none (no expense recorded yet)");
  }
  lines.push("");
  if (ctx.budgets.length > 0) {
    lines.push("Budgets (active this month):");
    for (const b of ctx.budgets) {
      lines.push(
        `  - ${b.name}: ${b.spent.toFixed(2)} of ${b.limit.toFixed(2)} (${b.pctUsed.toFixed(0)}% used)`,
      );
    }
  } else {
    lines.push("Budgets: none configured");
  }
  return lines.join("\n");
}

export interface StreamUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
}

/**
 * Yields text deltas as they arrive from the LLM. Resolves with a usage
 * summary once the stream completes — caller forwards both the text (to
 * the user) and the usage (to the audit log).
 */
export async function* streamSpendingExplanation(
  ctx: ExplanationContext,
): AsyncGenerator<string, StreamUsage, void> {
  const client = getClient();
  const userMessage = formatContextForUser(ctx);

  const stream = await client.chat.completions.create({
    model: getModel(),
    stream: true,
    // Ask the provider to include token usage in the final chunk. Most
    // OpenAI-compatible providers (NVIDIA NIM included) honour this.
    stream_options: { include_usage: true },
    max_tokens: 512,
    temperature: 0.3,
    top_p: 0.9,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  let inputTokens = 0;
  let outputTokens = 0;
  let cacheReadTokens = 0;

  for await (const chunk of stream) {
    // Delta chunks: text content
    const delta = chunk.choices?.[0]?.delta?.content;
    if (typeof delta === "string" && delta.length > 0) {
      yield delta;
    }
    // Final chunk: usage info (no choices content)
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens ?? 0;
      outputTokens = chunk.usage.completion_tokens ?? 0;
      // OpenAI exposes cached prefix tokens via prompt_tokens_details.
      // NVIDIA NIM doesn't always populate this; default to 0.
      const details = (
        chunk.usage as { prompt_tokens_details?: { cached_tokens?: number } }
      ).prompt_tokens_details;
      cacheReadTokens = details?.cached_tokens ?? 0;
    }
  }

  return { inputTokens, outputTokens, cacheReadTokens };
}
