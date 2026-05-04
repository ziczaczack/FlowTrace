// Client-side helper for tracking which ledger the user is currently
// writing to. The dashboard summary spans all accessible ledgers (via RLS),
// but write surfaces (QuickAddBar, FAB, transaction modal) need to know
// which specific ledger to insert into.
//
// Stored in localStorage so it survives reloads. Server doesn't read this —
// it's purely a UI preference.

import { useEffect, useState } from "react";
import type { LedgerWithMembership } from "@/types/database";

export const ACTIVE_LEDGER_KEY = "flowtrace-active-ledger";

/** Returns the writable subset of accessible ledgers (owner + editor). */
export function writableLedgers(
  ledgers: LedgerWithMembership[],
): LedgerWithMembership[] {
  return ledgers.filter((l) => l.role === "owner" || l.role === "editor");
}

/**
 * Reactive accessor for the active ledger. Falls back to the first writable
 * ledger if no preference is stored or if the stored ledger is no longer
 * accessible. Persists changes to localStorage.
 */
export function useActiveLedger(
  ledgers: LedgerWithMembership[],
): [LedgerWithMembership | null, (id: string) => void] {
  const writable = writableLedgers(ledgers);

  function pickInitial(): string {
    if (writable.length === 0) return "";
    if (typeof window === "undefined") return writable[0].id;
    const stored = window.localStorage.getItem(ACTIVE_LEDGER_KEY);
    if (stored && writable.some((l) => l.id === stored)) return stored;
    // Prefer the user's owned default-flagged ledger when no preference set.
    const ownedDefault = writable.find(
      (l) => l.role === "owner" && l.is_default,
    );
    return (ownedDefault ?? writable[0]).id;
  }

  const [activeId, setActiveId] = useState<string>(pickInitial);

  // Re-sync when the ledgers list changes (e.g. user joins/leaves a shared
  // ledger and the parent re-renders).
  useEffect(() => {
    if (writable.length === 0) {
      if (activeId) setActiveId("");
      return;
    }
    if (!writable.some((l) => l.id === activeId)) {
      setActiveId(pickInitial());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgers]);

  function update(id: string) {
    if (!writable.some((l) => l.id === id)) return;
    setActiveId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_LEDGER_KEY, id);
    }
  }

  const active = writable.find((l) => l.id === activeId) ?? null;
  return [active, update];
}
