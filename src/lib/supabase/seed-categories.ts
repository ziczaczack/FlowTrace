// One-time seeding helper for system default categories.
// System categories have user_id = NULL and are visible to every user via RLS.

import { createClient } from "@/lib/supabase/server";

type SeedCategory = {
  name: string;
  icon: string;
  color: string;
  type: "income" | "expense";
};

const EXPENSES: SeedCategory[] = [
  { name: "Food & Drinks", icon: "🍜", color: "#F59E0B", type: "expense" },
  { name: "Transport", icon: "🚗", color: "#3B82F6", type: "expense" },
  { name: "Shopping", icon: "🛍️", color: "#8B5CF6", type: "expense" },
  { name: "Entertainment", icon: "🎮", color: "#EC4899", type: "expense" },
  { name: "Health", icon: "💊", color: "#EF4444", type: "expense" },
  { name: "Bills & Utilities", icon: "💡", color: "#6366F1", type: "expense" },
  { name: "Education", icon: "📚", color: "#14B8A6", type: "expense" },
  { name: "Travel", icon: "✈️", color: "#F97316", type: "expense" },
  { name: "Personal Care", icon: "💆", color: "#A855F7", type: "expense" },
  { name: "Others", icon: "📦", color: "#6B7280", type: "expense" },
];

const INCOMES: SeedCategory[] = [
  { name: "Salary", icon: "💰", color: "#10B981", type: "income" },
  { name: "Freelance", icon: "💻", color: "#10B981", type: "income" },
  { name: "Investment", icon: "📈", color: "#10B981", type: "income" },
  { name: "Gift", icon: "🎁", color: "#10B981", type: "income" },
  { name: "Others", icon: "💵", color: "#10B981", type: "income" },
];

export async function seedCategories(): Promise<{
  inserted: number;
  skipped: boolean;
}> {
  const supabase = await createClient();

  // Check if any system category already exists.
  const { data: existing, error: selectError } = await supabase
    .from("categories")
    .select("id")
    .is("user_id", null)
    .limit(1);

  if (selectError) throw new Error(selectError.message);
  if (existing && existing.length > 0) {
    return { inserted: 0, skipped: true };
  }

  const rows = [...EXPENSES, ...INCOMES].map((c) => ({
    user_id: null,
    name: c.name,
    icon: c.icon,
    color: c.color,
    type: c.type,
  }));

  const { error: insertError } = await supabase.from("categories").insert(rows);
  if (insertError) throw new Error(insertError.message);

  return { inserted: rows.length, skipped: false };
}
