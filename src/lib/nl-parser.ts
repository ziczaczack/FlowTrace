// Natural-language parser for FlowTrace quick-add bar.
//
// Accepted inputs (case-insensitive):
//   "25 coffee"            → expense 25, category Coffee/Food, today
//   "lunch 15 yesterday"   → expense 15, category matching "lunch", yesterday
//   "+500 salary"          → income 500, category matching "salary", today
//   "100 groceries monday" → expense 100, last Monday
//   "25.50 taxi 3 days ago"→ expense 25.50, 3 days back
//
// The parser is pure — it takes the raw string plus the user's category list
// and returns a structured preview that the UI can render, or `null` if the
// input is too ambiguous.

import type { Category } from "@/types/database";

export interface ParsedEntry {
  amount: number;
  type: "income" | "expense";
  categoryId: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string | null;
  txnDate: string; // YYYY-MM-DD
  note: string | null;
  rawTokens: string[];
  confidence: "high" | "medium" | "low";
}

const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

const INCOME_HINTS = [
  "salary",
  "paycheck",
  "income",
  "bonus",
  "refund",
  "dividend",
  "interest",
  "received",
];

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function extractDate(
  text: string,
  today: Date,
): { date: string; stripped: string } {
  let stripped = text;
  let date = toYmd(today);

  const ago = stripped.match(/(\d+)\s+days?\s+ago/i);
  if (ago) {
    const n = parseInt(ago[1], 10);
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    date = toYmd(d);
    stripped = stripped.replace(ago[0], "").trim();
    return { date, stripped };
  }

  if (/\byesterday\b/i.test(stripped)) {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    date = toYmd(d);
    stripped = stripped.replace(/\byesterday\b/i, "").trim();
    return { date, stripped };
  }

  if (/\btoday\b/i.test(stripped)) {
    stripped = stripped.replace(/\btoday\b/i, "").trim();
    return { date, stripped };
  }

  // Last-N weekday
  const wd = stripped.match(
    /\b(?:last\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
  );
  if (wd) {
    const target = WEEKDAYS.indexOf(wd[1].toLowerCase());
    const cur = today.getDay();
    let diff = cur - target;
    if (diff <= 0) diff += 7; // always go backwards
    const d = new Date(today);
    d.setDate(d.getDate() - diff);
    date = toYmd(d);
    stripped = stripped.replace(wd[0], "").trim();
  }

  // YYYY-MM-DD explicit
  const iso = stripped.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) {
    date = iso[1];
    stripped = stripped.replace(iso[0], "").trim();
  }

  return { date, stripped };
}

function extractAmount(
  text: string,
): { amount: number; type: "income" | "expense"; stripped: string } | null {
  // Leading + for income, leading - for expense
  let type: "income" | "expense" = "expense";
  let cleaned = text;

  const leading = cleaned.match(/^\s*([+\-])/);
  if (leading) {
    type = leading[1] === "+" ? "income" : "expense";
    cleaned = cleaned.replace(/^\s*[+\-]/, "");
  }

  const match = cleaned.match(/\b(\d+(?:[.,]\d{1,2})?)\b/);
  if (!match) return null;

  const amount = parseFloat(match[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const stripped = cleaned.replace(match[0], "").trim().replace(/\s+/g, " ");
  return { amount, type, stripped };
}

function scoreCategory(
  remaining: string,
  category: Category,
): number {
  const hay = remaining.toLowerCase();
  const name = category.name.toLowerCase();
  if (!name) return 0;

  // Prefer exact word matches
  const nameTokens = name.split(/\s+/);
  let score = 0;
  for (const tok of nameTokens) {
    if (tok.length < 3) continue;
    if (new RegExp(`\\b${tok}\\b`, "i").test(hay)) score += 10 + tok.length;
  }
  // Partial contains fallback (lower weight)
  if (score === 0 && hay.includes(name)) score = 5;
  return score;
}

// Map common english words → likely category names (only used when user's
// own categories don't match).
const KEYWORD_HINTS: { re: RegExp; names: string[] }[] = [
  { re: /coffee|latte|espresso|cafe/i, names: ["Food", "Dining", "Coffee"] },
  { re: /lunch|dinner|breakfast|meal|restaurant|eat/i, names: ["Food", "Dining"] },
  { re: /grocer|mart|supermarket/i, names: ["Groceries", "Food"] },
  { re: /taxi|uber|grab|bus|mrt|lrt|train/i, names: ["Transport", "Transportation"] },
  { re: /fuel|petrol|gas/i, names: ["Transport", "Fuel"] },
  { re: /rent|mortgage/i, names: ["Rent", "Housing"] },
  { re: /movie|cinema|netflix|spotify/i, names: ["Entertainment"] },
  { re: /shop|mall|clothes|apparel/i, names: ["Shopping"] },
  { re: /doctor|clinic|medicine|pharmacy|hospital/i, names: ["Health", "Medical"] },
];

export function parseQuickAdd(
  input: string,
  categories: Category[],
  today: Date = new Date(),
): ParsedEntry | null {
  const raw = input.trim();
  if (!raw) return null;

  const amountResult = extractAmount(raw);
  if (!amountResult) return null;

  const { amount, stripped: afterAmount } = amountResult;
  let { type } = amountResult;

  const { date, stripped: afterDate } = extractDate(afterAmount, today);

  const remaining = afterDate.trim();

  // Upgrade to income if the remaining text contains any obvious income hint
  if (
    type === "expense" &&
    INCOME_HINTS.some((w) => new RegExp(`\\b${w}\\b`, "i").test(remaining))
  ) {
    type = "income";
  }

  const relevantCategories = categories.filter((c) => c.type === type);
  const pool = relevantCategories.length > 0 ? relevantCategories : categories;

  let best: Category | null = null;
  let bestScore = 0;
  let confidence: ParsedEntry["confidence"] = "low";

  // 1. Score user's own categories
  for (const cat of pool) {
    const s = scoreCategory(remaining, cat);
    if (s > bestScore) {
      bestScore = s;
      best = cat;
    }
  }

  if (best && bestScore >= 10) {
    confidence = "high";
  } else {
    // 2. Try keyword hints → find matching category name
    for (const hint of KEYWORD_HINTS) {
      if (hint.re.test(remaining)) {
        const match = pool.find((c) =>
          hint.names.some((n) => c.name.toLowerCase().includes(n.toLowerCase())),
        );
        if (match) {
          best = match;
          confidence = "medium";
          break;
        }
      }
    }
  }

  // 3. Fallback to first category of matching type
  if (!best) {
    best = pool[0] ?? categories[0] ?? null;
    confidence = "low";
  }

  if (!best) return null;

  const note = remaining
    .replace(new RegExp(best.name, "ig"), "")
    .trim()
    .replace(/\s+/g, " ");

  return {
    amount,
    type,
    categoryId: best.id,
    categoryName: best.name,
    categoryIcon: best.icon,
    categoryColor: best.color,
    txnDate: date,
    note: note.length > 0 ? note : null,
    rawTokens: raw.split(/\s+/),
    confidence,
  };
}
