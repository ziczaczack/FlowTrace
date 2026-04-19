import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTransactionsByDate } from "@/lib/supabase/queries";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { data: null, error: "Missing or invalid date (YYYY-MM-DD)" },
        { status: 400 },
      );
    }

    const data = await getTransactionsByDate(user.id, date);
    return NextResponse.json({ data, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { data: null, error: message },
      { status: 500 },
    );
  }
}
