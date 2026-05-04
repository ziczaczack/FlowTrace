import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLedgerAccess } from "@/lib/supabase/ledger-access";
import type { LedgerRole } from "@/types/database";

const VALID_ROLES: LedgerRole[] = ["owner", "editor", "viewer"];

interface RouteContext {
  params: Promise<{ id: string; memberId: string }>;
}

/**
 * DELETE — remove a member. Owner can remove anyone except themselves
 * (must transfer ownership or delete the ledger first). Any member can
 * remove themselves (= leave).
 */
export async function DELETE(_req: Request, ctx: RouteContext) {
  const { id: ledgerId, memberId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const access = await getLedgerAccess(supabase, ledgerId, user.id);
  if (!access.hasAccess) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const isSelf = memberId === user.id;
  if (!isSelf && !access.isOwner) {
    return NextResponse.json(
      { error: "only the ledger owner can remove other members" },
      { status: 403 },
    );
  }

  // Owner trying to remove themselves: block — must transfer ownership
  // first or delete the ledger.
  if (isSelf && access.isOwner) {
    return NextResponse.json(
      {
        error:
          "owners cannot leave; transfer ownership to another member first or delete the ledger",
      },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("ledger_members")
    .delete()
    .eq("ledger_id", ledgerId)
    .eq("user_id", memberId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** PATCH — change a member's role. Owner only. Body: { role } */
export async function PATCH(req: Request, ctx: RouteContext) {
  const { id: ledgerId, memberId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const access = await getLedgerAccess(supabase, ledgerId, user.id);
  if (!access.isOwner) {
    return NextResponse.json(
      { error: "only the ledger owner can change roles" },
      { status: 403 },
    );
  }

  let body: { role?: LedgerRole } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const role = body.role;
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { error: `role must be one of: ${VALID_ROLES.join(", ")}` },
      { status: 400 },
    );
  }

  // Block changing the last owner's role away from owner — guards against
  // accidentally orphaning the ledger.
  if (memberId === user.id && role !== "owner") {
    return NextResponse.json(
      {
        error:
          "you can't demote yourself; promote another member to owner first",
      },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("ledger_members")
    .update({ role })
    .eq("ledger_id", ledgerId)
    .eq("user_id", memberId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
