import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTransactionsByMonth } from "@/lib/supabase/queries";

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
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));
    if (!month || !year) {
      return NextResponse.json(
        { data: null, error: "Missing month or year" },
        { status: 400 },
      );
    }

    const data = await getTransactionsByMonth(user.id, month, year);
    return NextResponse.json({ data, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { data: null, error: message },
      { status: 500 },
    );
  }
}
