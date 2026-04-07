import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  addTransaction,
  getTransactions,
} from "@/lib/supabase/queries";

async function verifyLedgerOwnership(ledgerId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ledgers")
    .select("id")
    .eq("id", ledgerId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

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
    const ledgerId = searchParams.get("ledgerId");
    const month = Number(searchParams.get("month"));
    const year = Number(searchParams.get("year"));

    if (!ledgerId || !month || !year) {
      return NextResponse.json(
        { data: null, error: "Missing ledgerId, month, or year" },
        { status: 400 },
      );
    }

    const owns = await verifyLedgerOwnership(ledgerId, user.id);
    if (!owns) {
      return NextResponse.json(
        { data: null, error: "Forbidden" },
        { status: 403 },
      );
    }

    const data = await getTransactions(ledgerId, month, year);
    return NextResponse.json({ data, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { data: null, error: message },
      { status: 500 },
    );
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
      ledgerId,
      amount,
      type,
      categoryId,
      note,
      paymentMethod,
      txnDate,
    } = body ?? {};

    if (!ledgerId || amount === undefined || !type || !categoryId || !txnDate) {
      return NextResponse.json(
        { data: null, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const owns = await verifyLedgerOwnership(ledgerId, user.id);
    if (!owns) {
      return NextResponse.json(
        { data: null, error: "Forbidden" },
        { status: 403 },
      );
    }

    const data = await addTransaction(ledgerId, {
      amount: Number(amount),
      type,
      categoryId,
      paymentMethod,
      note,
      txnDate,
    });
    return NextResponse.json({ data, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { data: null, error: message },
      { status: 500 },
    );
  }
}
