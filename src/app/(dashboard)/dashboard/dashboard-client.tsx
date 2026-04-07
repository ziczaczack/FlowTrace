"use client";

import { useState } from "react";
import { Fab } from "@/components/ui/fab";
import { TransactionModal } from "@/components/ui/transaction-modal";
import { useTransactions } from "@/hooks/use-transactions";

type Props = { ledgerId: string };

export function DashboardClient({ ledgerId }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const { transactions, loading, error, add } = useTransactions(ledgerId);

  return (
    <>
      <section>
        <h2 className="mb-3 text-lg font-medium text-white/90">
          This month&apos;s transactions
        </h2>

        {loading && <p className="text-sm text-white/50">Loading...</p>}
        {error && <p className="text-sm text-[#F43F5E]">{error}</p>}
        {!loading && transactions.length === 0 && (
          <p className="text-sm text-white/50">
            No transactions yet. Tap + to add one.
          </p>
        )}

        <ul className="divide-y divide-white/5">
          {transactions.map((t) => {
            const amount = parseFloat(t.amount);
            const display = amount.toLocaleString("en-MY", {
              style: "currency",
              currency: "MYR",
            });
            const sign =
              t.type === "income" ? "+" : t.type === "expense" ? "-" : "";
            const color =
              t.type === "income"
                ? "text-[#10B981]"
                : t.type === "expense"
                  ? "text-[#F43F5E]"
                  : "text-[#3B82F6]";
            return (
              <li key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm text-white">
                    {t.category?.name ?? "Uncategorised"}
                  </p>
                  <p className="text-xs text-white/50">{t.txn_date}</p>
                </div>
                <p className={`text-sm font-medium ${color}`}>
                  {sign}
                  {display}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <Fab onClick={() => setModalOpen(true)} hidden={modalOpen} />

      <TransactionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={add}
        mode="create"
      />
    </>
  );
}
