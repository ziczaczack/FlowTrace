"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  Mail,
  UserMinus,
  Users,
} from "lucide-react";
import type {
  LedgerMemberWithProfile,
  LedgerRole,
  LedgerWithMembership,
} from "@/types/database";

interface Props {
  ledgers: LedgerWithMembership[];
  currentUserId: string;
}

export function LedgerShareManager({ ledgers, currentUserId }: Props) {
  if (ledgers.length === 0) {
    return (
      <p className="text-sm text-subtle-foreground">No ledgers yet.</p>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {ledgers.map((l) => (
        <LedgerCard key={l.id} ledger={l} currentUserId={currentUserId} />
      ))}
    </div>
  );
}

function LedgerCard({
  ledger,
  currentUserId,
}: {
  ledger: LedgerWithMembership;
  currentUserId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState<LedgerMemberWithProfile[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadMembers() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/ledgers/${ledger.id}/members`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load members");
      setMembers(json.data ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && members === null) void loadMembers();
  }

  return (
    <div className="rounded-2xl border border-border bg-surface-muted/30">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="text-xl" aria-hidden>
            {ledger.icon ?? "💼"}
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-medium text-foreground">
              {ledger.name}
            </span>
            <span className="flex items-center gap-2 text-xs text-subtle-foreground">
              <RoleBadge role={ledger.role} />
              <span>·</span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" aria-hidden />
                {ledger.member_count}
              </span>
            </span>
          </span>
        </span>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-subtle-foreground" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4 text-subtle-foreground" aria-hidden />
        )}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-4">
          {loading && (
            <div className="flex items-center gap-2 text-xs text-subtle-foreground">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Loading members…
            </div>
          )}
          {loadError && (
            <p className="text-xs text-negative">{loadError}</p>
          )}
          {members && (
            <MembersList
              ledgerId={ledger.id}
              members={members}
              currentUserId={currentUserId}
              currentUserRole={ledger.role}
              onChange={loadMembers}
            />
          )}
        </div>
      )}
    </div>
  );
}

function MembersList({
  ledgerId,
  members,
  currentUserId,
  currentUserRole,
  onChange,
}: {
  ledgerId: string;
  members: LedgerMemberWithProfile[];
  currentUserId: string;
  currentUserRole: LedgerRole;
  onChange: () => void | Promise<void>;
}) {
  const isOwner = currentUserRole === "owner";

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {members.map((m) => {
          const isSelf = m.user_id === currentUserId;
          const canRemove = isSelf ? !isOwner : isOwner;
          return (
            <li
              key={m.user_id}
              className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted/50 px-3 py-2"
            >
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-medium text-foreground">
                  {m.email ?? "(no email)"}
                  {isSelf && (
                    <span className="ml-2 text-xs text-subtle-foreground">
                      you
                    </span>
                  )}
                </span>
                <span className="text-xs text-subtle-foreground">
                  Joined{" "}
                  {new Date(m.joined_at).toLocaleDateString("en-MY", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isOwner && !isSelf ? (
                  <RoleSelect
                    role={m.role}
                    onChange={async (next) => {
                      await fetch(
                        `/api/ledgers/${ledgerId}/members/${m.user_id}`,
                        {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ role: next }),
                        },
                      );
                      await onChange();
                    }}
                  />
                ) : (
                  <RoleBadge role={m.role} />
                )}
                {canRemove && (
                  <RemoveButton
                    ledgerId={ledgerId}
                    memberId={m.user_id}
                    isSelf={isSelf}
                    onDone={onChange}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {isOwner && <InviteForm ledgerId={ledgerId} onInvited={onChange} />}
      {!isOwner && (
        <p className="text-xs text-subtle-foreground">
          Only the ledger owner can invite or change members.
        </p>
      )}
    </div>
  );
}

function InviteForm({
  ledgerId,
  onInvited,
}: {
  ledgerId: string;
  onInvited: () => void | Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<LedgerRole>("editor");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/ledgers/${ledgerId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Invite failed");
      setEmail("");
      await onInvited();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-surface-muted/30 p-3"
    >
      <p className="flex items-center gap-2 text-xs font-medium text-subtle-foreground">
        <Mail className="h-3 w-3" aria-hidden />
        Invite by email
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="email"
          required
          placeholder="someone@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as LedgerRole)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        >
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
        <button
          type="submit"
          disabled={submitting || !email}
          className="cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Inviting…" : "Invite"}
        </button>
      </div>
      {error && <p className="text-xs text-negative">{error}</p>}
      <p className="text-[11px] text-subtle-foreground">
        The invitee must already have a FlowTrace account. They&apos;ll see this
        ledger next time they sign in.
      </p>
    </form>
  );
}

function RoleSelect({
  role,
  onChange,
}: {
  role: LedgerRole;
  onChange: (next: LedgerRole) => void | Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <select
      value={role}
      disabled={pending}
      onChange={(e) =>
        startTransition(async () => {
          await onChange(e.target.value as LedgerRole);
          router.refresh();
        })
      }
      className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-medium text-foreground outline-none focus:border-primary disabled:opacity-60"
    >
      <option value="owner">Owner</option>
      <option value="editor">Editor</option>
      <option value="viewer">Viewer</option>
    </select>
  );
}

function RemoveButton({
  ledgerId,
  memberId,
  isSelf,
  onDone,
}: {
  ledgerId: string;
  memberId: string;
  isSelf: boolean;
  onDone: () => void | Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function click() {
    const msg = isSelf
      ? "Leave this shared ledger? You'll lose access to its transactions."
      : "Remove this member from the ledger?";
    if (!confirm(msg)) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/ledgers/${ledgerId}/members/${memberId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Remove failed");
        return;
      }
      await onDone();
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={click}
      disabled={pending}
      title={isSelf ? "Leave" : "Remove"}
      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-subtle-foreground transition-colors hover:bg-negative/10 hover:text-negative disabled:opacity-60"
    >
      <UserMinus className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

function RoleBadge({ role }: { role: LedgerRole }) {
  const variants: Record<LedgerRole, string> = {
    owner: "bg-primary/15 text-primary",
    editor: "bg-foreground/10 text-foreground",
    viewer: "bg-surface-muted text-subtle-foreground",
  };
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${variants[role]}`}
    >
      {role}
    </span>
  );
}
