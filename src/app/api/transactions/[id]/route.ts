import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  deleteTransaction,
  updateTransaction,
} from "@/lib/supabase/queries";

async function verifyTransactionOwnership(txnId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id, ledger:ledgers!inner(user_id)")
    .eq("id", txnId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return false;
  // The joined "ledger" arrives as an object (or array, depending on the
  // PostgREST relationship inference). Normalise both shapes.
  const ledger = (data as { ledger: { user_id: string } | { user_id: string }[] })
    .ledger;
  const ownerId = Array.isArray(ledger) ? ledger[0]?.user_id : ledger?.user_id;
  return ownerId === userId;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    const owns = await verifyTransactionOwnership(id, user.id);
    if (!owns) {
      return NextResponse.json(
        { data: null, error: "Forbidden" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const data = await updateTransaction(id, body ?? {});
    return NextResponse.json({ data, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { data: null, error: message },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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

    const owns = await verifyTransactionOwnership(id, user.id);
    if (!owns) {
      return NextResponse.json(
        { data: null, error: "Forbidden" },
        { status: 403 },
      );
    }

    await deleteTransaction(id);
    return NextResponse.json({ data: { id }, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { data: null, error: message },
      { status: 500 },
    );
  }
}
