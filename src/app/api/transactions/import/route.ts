import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLedgerAccess } from "@/lib/supabase/ledger-access";
import type { ImportPayload, ImportResult } from "@/types/import";
import type { TransactionType } from "@/types/database";

// Normalize a description into a stable shape we can hash for dedup, so
// "  COFFEE  TIME " and "Coffee Time" collapse to the same key.
function normalizeNote(s: string | null): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ").slice(0, 64);
}

function dedupKey(
  txnDate: string,
  amount: number,
  type: TransactionType,
  note: string | null,
): string {
  return `${txnDate}|${amount.toFixed(2)}|${type}|${normalizeNote(note)}`;
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

    const body = (await request.json()) as Partial<ImportPayload>;
    const ledgerId = body.ledgerId;
    const rows = body.rows ?? [];

    if (!ledgerId || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { data: null, error: "Missing ledgerId or rows" },
        { status: 400 },
      );
    }

    if (rows.length > 1000) {
      return NextResponse.json(
        { data: null, error: "Too many rows in a single import (max 1000)" },
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

    // Validate every row up front — reject the whole import on the first
    // bad row so the caller gets a clear error rather than partial success.
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (
        !r.txnDate ||
        typeof r.amount !== "number" ||
        !Number.isFinite(r.amount) ||
        r.amount <= 0 ||
        !r.type ||
        !r.categoryId
      ) {
        return NextResponse.json(
          {
            data: null,
            error: `Row ${i + 1} is missing required fields (date, amount, type, category)`,
          },
          { status: 400 },
        );
      }
    }

    // Compute the date window so we can fetch a tight slice of existing
    // transactions for dedup.
    const dates = rows.map((r) => r.txnDate).sort();
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];

    const { data: existing, error: existingErr } = await supabase
      .from("transactions")
      .select("amount, type, txn_date, note")
      .eq("ledger_id", ledgerId)
      .gte("txn_date", minDate)
      .lte("txn_date", maxDate);

    if (existingErr) throw new Error(existingErr.message);

    const seen = new Set<string>();
    for (const ex of existing ?? []) {
      seen.add(
        dedupKey(
          ex.txn_date as string,
          parseFloat(ex.amount as string),
          ex.type as TransactionType,
          (ex.note as string | null) ?? null,
        ),
      );
    }

    const toInsert: {
      ledger_id: string;
      category_id: string;
      amount: number;
      type: TransactionType;
      payment_method: "bank_transfer";
      note: string | null;
      txn_date: string;
    }[] = [];
    let skipped = 0;

    for (const r of rows) {
      const key = dedupKey(r.txnDate, r.amount, r.type, r.note);
      if (seen.has(key)) {
        skipped += 1;
        continue;
      }
      seen.add(key); // also dedup within the import itself
      toInsert.push({
        ledger_id: ledgerId,
        category_id: r.categoryId,
        amount: r.amount,
        type: r.type,
        payment_method: "bank_transfer",
        note: r.note,
        txn_date: r.txnDate,
      });
    }

    let inserted = 0;
    if (toInsert.length > 0) {
      const { error: insertErr } = await supabase
        .from("transactions")
        .insert(toInsert);
      if (insertErr) throw new Error(insertErr.message);
      inserted = toInsert.length;
    }

    const result: ImportResult = { inserted, skipped, errors: [] };
    return NextResponse.json({ data: result, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { data: null, error: message },
      { status: 500 },
    );
  }
}
