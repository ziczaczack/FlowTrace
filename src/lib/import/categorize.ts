// Category suggestion for imported bank rows. Reuses the same keyword-hint
// logic as the natural-language quick-add bar, but exposes it as a standalone
// helper so the importer can pre-fill categories from raw merchant strings.

import type { Category, CategoryType } from "@/types/database";

const KEYWORD_HINTS: { re: RegExp; names: string[] }[] = [
  { re: /coffee|latte|espresso|cafe|starbuck/i, names: ["Food", "Dining", "Coffee"] },
  { re: /lunch|dinner|breakfast|meal|restaurant|eat|mcd|kfc|pizza|sushi/i, names: ["Food", "Dining"] },
  { re: /grocer|mart|supermarket|tesco|aeon|jaya|99\s?speed|lotus/i, names: ["Groceries", "Food"] },
  { re: /grab|taxi|uber|bus|mrt|lrt|train|toll|tng|touch.?n.?go/i, names: ["Transport", "Transportation"] },
  { re: /fuel|petrol|gas|petronas|shell|caltex/i, names: ["Transport", "Fuel"] },
  { re: /rent|mortgage|landlord/i, names: ["Rent", "Housing"] },
  { re: /movie|cinema|netflix|spotify|disney|youtube|game|steam/i, names: ["Entertainment"] },
  { re: /shop|mall|clothes|apparel|zara|uniqlo|h&m|shopee|lazada|amazon/i, names: ["Shopping"] },
  { re: /doctor|clinic|medicine|pharmacy|hospital|guardian|watson/i, names: ["Health", "Medical"] },
  { re: /electric|tnb|water|gas\s?bill|maxis|celcom|digi|unifi|astro/i, names: ["Utilities", "Bills"] },
  { re: /salary|payroll|wages|paycheck|bonus/i, names: ["Salary", "Income"] },
  { re: /interest|dividend|return/i, names: ["Investment", "Income"] },
  { re: /transfer|tt|fpx/i, names: ["Transfer"] },
  { re: /atm|cash withdrawal/i, names: ["Cash"] },
];

function scoreByName(text: string, name: string): number {
  if (!name) return 0;
  const hay = text.toLowerCase();
  const n = name.toLowerCase();
  if (hay.includes(n)) return 10 + n.length;
  return 0;
}

/**
 * Pick the most likely category for a transaction description.
 * First tries an exact name match against the user's own categories,
 * then falls back to keyword hints, then returns null.
 */
export function suggestCategory(
  description: string,
  categories: Category[],
  type: CategoryType,
): Category | null {
  if (!description) return null;
  const pool = categories.filter((c) => c.type === type);
  if (pool.length === 0) return null;

  // 1. Direct name match
  let best: Category | null = null;
  let bestScore = 0;
  for (const cat of pool) {
    const s = scoreByName(description, cat.name);
    if (s > bestScore) {
      best = cat;
      bestScore = s;
    }
  }
  if (best) return best;

  // 2. Keyword hints → find matching category by name
  for (const hint of KEYWORD_HINTS) {
    if (hint.re.test(description)) {
      const match = pool.find((c) =>
        hint.names.some((n) => c.name.toLowerCase().includes(n.toLowerCase())),
      );
      if (match) return match;
    }
  }

  return null;
}
