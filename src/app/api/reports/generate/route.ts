import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateMonthlyReport } from "@/lib/reports";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { data: null, error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: { month?: number; year?: number } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  let month = body.month;
  let year = body.year;
  if (!month || !year) {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    month = prev.getMonth() + 1;
    year = prev.getFullYear();
  }

  try {
    const report = await generateMonthlyReport(user.id, year, month);
    return NextResponse.json({ data: report, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ data: null, error: message }, { status: 500 });
  }
}
