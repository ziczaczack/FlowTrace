"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Fab } from "@/components/ui/fab";
import { TransactionModal } from "@/components/ui/transaction-modal";
import type { LedgerWithMembership } from "@/types/database";
import type { NewTransaction } from "@/types/forms";
import { ACTIVE_LEDGER_KEY } from "@/lib/active-ledger";

type Props = { ledgers: LedgerWithMembership[] };

/**
 * Wires the FAB and quick-add modal into the server-rendered dashboard. The
 * modal writes to whichever ledger is currently active in localStorage —
 * same selection the QuickAddBar respects, so the two stay in sync.
 */
export function DashboardFab({ ledgers }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [activeId, setActiveId] = useState<string>("");
  const router = useRouter();

  // Read the active ledger from localStorage on every modal open so we
  // always pick up the most recent QuickAddBar selection.
  useEffect(() => {
    if (!modalOpen) return;
    const writable = ledgers.filter(
      (l) => l.role === "owner" || l.role === "editor",
    );
    if (writable.length === 0) {
      setActiveId("");
      return;
    }
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem(ACTIVE_LEDGER_KEY)
        : null;
    if (stored && writable.some((l) => l.id === stored)) {
      setActiveId(stored);
      return;
    }
    const ownedDefault = writable.find(
      (l) => l.role === "owner" && l.is_default,
    );
    setActiveId((ownedDefault ?? writable[0]).id);
  }, [modalOpen, ledgers]);

  async function handleSave(data: NewTransaction) {
    if (!activeId) {
      throw new Error("No writable ledger available");
    }
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ledgerId: activeId, ...data }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error ?? "Failed to add transaction");
    }
    router.refresh();
  }

  return (
    <>
      <Fab onClick={() => setModalOpen(true)} hidden={modalOpen} />
      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        mode="create"
      />
    </>
  );
}
