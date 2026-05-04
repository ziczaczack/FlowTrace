import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLedgerAccess } from "@/lib/supabase/ledger-access";

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
      categoryId,
      name,
      amount,
      frequency,
      nextDue,
      linkAmount,
      linkNote,
    } = body ?? {};

    if (
      !ledgerId ||
      !name ||
      amount === undefined ||
      !frequency ||
      !nextDue
    ) {
      return NextResponse.json(
        { data: null, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const allowedFreq = new Set(["daily", "weekly", "monthly", "yearly"]);
    if (!allowedFreq.has(frequency)) {
      return NextResponse.json(
        { data: null, error: "Invalid frequency" },
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

    // dayOfMonth derived from nextDue for monthly cadence — used by future
    // automated generation logic; harmless for weekly/daily.
    const dayOfMonth =
      frequency === "monthly" ? new Date(nextDue).getDate() : null;

    const { data: rule, error: insertError } = await supabase
      .from("recurring_rules")
      .insert({
        ledger_id: ledgerId,
        category_id: categoryId ?? null,
        name,
        amount: Number(amount),
        frequency,
        day_of_month: dayOfMonth,
        next_due: nextDue,
        is_active: true,
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json(
        { data: null, error: insertError.message },
        { status: 500 },
      );
    }

    // Best-effort: link historical matching transactions to this rule so we
    // don't keep re-detecting them. Match on ledger + amount; tightened by
    // an exact normalized note match when one was supplied.
    if (rule?.id && linkAmount !== undefined) {
      let q = supabase
        .from("transactions")
        .update({ recurring_rule_id: rule.id })
        .eq("ledger_id", ledgerId)
        .eq("type", "expense")
        .eq("amount", Number(linkAmount))
        .is("recurring_rule_id", null);
      if (linkNote) q = q.eq("note", linkNote);
      // Errors here are non-fatal — surface in the response but the rule
      // itself was created successfully.
      const { error: linkError } = await q;
      if (linkError) {
        return NextResponse.json({
          data: rule,
          error: null,
          warning: `Rule saved but couldn't backfill links: ${linkError.message}`,
        });
      }
    }

    return NextResponse.json({ data: rule, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { data: null, error: message },
      { status: 500 },
    );
  }
}
