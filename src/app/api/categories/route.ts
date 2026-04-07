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
