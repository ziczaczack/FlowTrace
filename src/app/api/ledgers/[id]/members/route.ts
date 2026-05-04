import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLedgerAccess } from "@/lib/supabase/ledger-access";
import { getLedgerMembers } from "@/lib/supabase/queries";
import type { LedgerRole } from "@/types/database";

const VALID_ROLES: LedgerRole[] = ["owner", "editor", "viewer"];

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** GET — list every member of the ledger. Any member can call. */
export async function GET(_req: Request, ctx: RouteContext) {
  const { id: ledgerId } = await ctx.params;
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

  try {
    const members = await getLedgerMembers(ledgerId);
    return NextResponse.json({ data: members });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST — invite by email. Owner only. Body: { email, role? } */
export async function POST(req: Request, ctx: RouteContext) {
  const { id: ledgerId } = await ctx.params;
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
      { error: "only the ledger owner can invite members" },
      { status: 403 },
    );
  }

  let body: { email?: string; role?: LedgerRole } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const role = body.role ?? "editor";
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "a valid email is required" },
      { status: 400 },
    );
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { error: `role must be one of: ${VALID_ROLES.join(", ")}` },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.rpc("invite_ledger_member", {
    p_ledger_id: ledgerId,
    p_email: email,
    p_role: role,
  });
  if (error) {
    const msg = error.message ?? "invite failed";
    const status = /no user with that email/i.test(msg) ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }

  return NextResponse.json({ data });
}
