import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  addTransaction,
  getTransactions,
} from "@/lib/supabase/queries";
import { getLedgerAccess } from "@/lib/supabase/ledger-access";

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

    const access = await getLedgerAccess(supabase, ledgerId, user.id);
    if (!access.hasAccess) {
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

    const access = await getLedgerAccess(supabase, ledgerId, user.id);
    if (!access.canWrite) {
      return NextResponse.json(
        { data: null, error: access.hasAccess ? "Read-only access" : "Forbidden" },
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
