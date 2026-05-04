import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSavingsGoals } from "@/lib/supabase/queries";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { data: null, error: "Not authenticated" },
        { status: 401 },
      );
    }
    const data = await getSavingsGoals(user.id);
    return NextResponse.json({ data, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { data: null, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const {
      name,
      icon,
      color,
      targetAmount,
      currentAmount,
      targetDate,
    } = body ?? {};

    if (!name || targetAmount === undefined) {
      return NextResponse.json(
        { data: null, error: "Missing name or targetAmount" },
        { status: 400 },
      );
    }
    const target = Number(targetAmount);
    if (!Number.isFinite(target) || target <= 0) {
      return NextResponse.json(
        { data: null, error: "targetAmount must be a positive number" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("savings_goals")
      .insert({
        user_id: user.id,
        name,
        icon: icon ?? "🎯",
        color: color ?? "#10b981",
        target_amount: target,
        current_amount:
          currentAmount === undefined ? 0 : Number(currentAmount),
        target_date: targetDate ?? null,
        is_active: true,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { data: null, error: error.message },
        { status: 500 },
      );
    }
    return NextResponse.json({ data, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
