import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCategories } from "@/lib/supabase/queries";

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

    const data = await getCategories(user.id);
    return NextResponse.json({ data, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { data: null, error: message },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
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

    let body: { name?: string; icon?: string; color?: string; type?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ data: null, error: "Invalid JSON" }, { status: 400 });
    }

    const { name, icon, color, type } = body;
    if (!name || !name.trim()) {
      return NextResponse.json({ data: null, error: "Name is required" }, { status: 400 });
    }
    if (type !== "income" && type !== "expense") {
      return NextResponse.json(
        { data: null, error: "type must be 'income' or 'expense'" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: user.id,
        name: name.trim(),
        icon: icon ?? "📦",
        color: color ?? "#6B7280",
        type,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ data: null, error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Only allow deleting user-owned categories (not system ones)
    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return new Response(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
