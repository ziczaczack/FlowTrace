import { NextResponse } from "next/server";
import { seedCategories } from "@/lib/supabase/seed-categories";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { seeded: false, error: "Disabled in production" },
      { status: 403 },
    );
  }

  try {
    const result = await seedCategories();
    return NextResponse.json({ seeded: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { seeded: false, error: message },
      { status: 500 },
    );
  }
}
