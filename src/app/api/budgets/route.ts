import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("budgets")
    .select("*, category:categories ( id, name, icon, color )")
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data: data ?? [], error: null });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ data: null, error: "Unauthorized" }, { status: 401 });
  }

  let body: { categoryId?: string; amountLimit?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ data: null, error: "Invalid JSON" }, { status: 400 });
  }

  const { categoryId, amountLimit } = body;
  if (!categoryId || typeof amountLimit !== "number" || amountLimit <= 0) {
    return NextResponse.json(
      { data: null, error: "categoryId and a positive amountLimit are required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      {
        user_id: user.id,
        category_id: categoryId,
        amount_limit: amountLimit,
        period: "monthly",
      },
      { onConflict: "user_id,category_id,period" },
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data, error: null });
}
