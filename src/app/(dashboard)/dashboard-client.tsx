"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Fab } from "@/components/ui/fab";
import { TransactionModal } from "@/components/ui/transaction-modal";
import type { NewTransaction } from "@/types/forms";

type Props = { ledgerId: string };

/**
 * Wires the FAB and quick-add modal into the server-rendered dashboard. On a
 * successful add we call router.refresh() so the Server Component re-fetches
 * its summary data.
 */
export function DashboardFab({ ledgerId }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  async function handleSave(data: NewTransaction) {
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ledgerId, ...data }),
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
