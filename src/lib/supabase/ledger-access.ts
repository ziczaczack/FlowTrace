// Centralised ledger-access checks. Used by API routes that need to gate
// reads/writes on a specific ledger.
//
// Reads vs writes:
//   - Read: any role (owner, editor, viewer)
//   - Write: owner or editor only
//
// All checks go through ledger_members (the source of truth post-shared
// ledgers migration). RLS will also enforce these rules at the row level —
// these helpers exist so API routes can return a proper 403 instead of
// surfacing a Postgres RLS error.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { LedgerRole } from "@/types/database";

const WRITE_ROLES: LedgerRole[] = ["owner", "editor"];

export interface LedgerAccess {
  hasAccess: boolean;
  canWrite: boolean;
  isOwner: boolean;
  role: LedgerRole | null;
}

/**
 * Returns the user's access level to a specific ledger. `hasAccess: false`
 * if they aren't a member.
 */
export async function getLedgerAccess(
  supabase: SupabaseClient,
  ledgerId: string,
  userId: string,
): Promise<LedgerAccess> {
  const { data } = await supabase
    .from("ledger_members")
    .select("role")
    .eq("ledger_id", ledgerId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) {
    return { hasAccess: false, canWrite: false, isOwner: false, role: null };
  }
  const role = data.role as LedgerRole;
  return {
    hasAccess: true,
    canWrite: WRITE_ROLES.includes(role),
    isOwner: role === "owner",
    role,
  };
}
