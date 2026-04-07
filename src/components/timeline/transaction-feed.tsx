"use client";

import { useEffect, useMemo, useState } from "react";
import { Fab } from "@/components/ui/fab";
import { TransactionModal } from "@/components/ui/transaction-modal";
import { Toast } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { MonthSelector } from "@/components/timeline/month-selector";
import { TransactionRow } from "@/components/timeline/transaction-row";
import { groupTransactionsByDate, formatMYR } from "@/lib/utils";
import type { Transaction } from "@/types/database";
import type { NewTransaction } from "@/types/forms";

type Props = {
  initialTransactions: Transaction[];
  month: number;
  year: number;
  userId: string;
  defaultLedgerId: string;
  accountCreatedAt?: string | null;
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function TransactionFeed({
  initialTransactions,
  month: initialMonth,
  year: initialYear,
  defaultLedgerId,
  accountCreatedAt,
}: Props) {
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const { toast, showToast } = useToast();

  // Re-sync if the server passes new initial data (e.g. via router.refresh).
  useEffect(() => {
    setTransactions(initialTransactions);
  }, [initialTransactions]);

  async function loadMonth(m: number, y: number) {
    setLoadingMonth(true);
    try {
      const res = await fetch(
        `/api/transactions/month?month=${m}&year=${y}`,
      );
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Failed to load transactions");
      }
      setTransactions((json.data ?? []) as Transaction[]);
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Failed to load transactions",
        "error",
      );
    } finally {
      setLoadingMonth(false);
    }
  }

  function handleMonthChange(m: number, y: number) {
    setMonth(m);
    setYear(y);
    loadMonth(m, y);
  }

  async function handleAdd(data: NewTransaction) {
    const tempId = `temp-${Date.now()}`;
    const optimistic: Transaction = {
      id: tempId,
      ledger_id: defaultLedgerId,
      category_id: data.categoryId,
      recurring_rule_id: null,
      transfer_pair_id: null,
      amount: String(data.amount),
      type: data.type,
      payment_method:
        (data.paymentMethod as Transaction["payment_method"]) ?? null,
      note: data.note ?? null,
      txn_date: data.txnDate,
      created_at: new Date().toISOString(),
      category: null,
    };
    const snapshot = transactions;
    setTransactions([optimistic, ...transactions]);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ledgerId: defaultLedgerId, ...data }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Failed to add transaction");
      }
      // Reload month so we get joined category metadata + correct ordering.
      await loadMonth(month, year);
      showToast("Transaction added", "success");
    } catch (e) {
      setTransactions(snapshot);
      showToast(
        e instanceof Error ? e.message : "Failed to add transaction",
        "error",
      );
      throw e;
    }
  }

  async function handleUpdate(data: NewTransaction) {
    if (!editing) return;
    const id = editing.id;
    const snapshot = transactions;
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              amount: String(data.amount),
              type: data.type,
              category_id: data.categoryId,
              payment_method:
                (data.paymentMethod as Transaction["payment_method"]) ?? null,
              note: data.note ?? null,
              txn_date: data.txnDate,
            }
          : t,
      ),
    );
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Failed to update");
      }
      await loadMonth(month, year);
      showToast("Transaction updated", "success");
    } catch (e) {
      setTransactions(snapshot);
      showToast(
        e instanceof Error ? e.message : "Failed to update transaction",
        "error",
      );
      throw e;
    }
  }

  async function handleDelete(id: string) {
    const snapshot = transactions;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Failed to delete");
      }
      showToast("Transaction deleted", "success");
    } catch (e) {
      setTransactions(snapshot);
      showToast(
        e instanceof Error ? e.message : "Failed to delete transaction",
        "error",
      );
      throw e;
    }
  }

  function handleEdit(t: Transaction) {
    setEditing(t);
    setModalOpen(true);
  }

  // Month summary, recomputed from current state.
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
      const v = parseFloat(t.amount);
      if (!Number.isFinite(v)) continue;
      if (t.type === "income") income += v;
      else if (t.type === "expense") expense += v;
    }
    return { income, expense, net: income - expense };
  }, [transactions]);

  const groups = useMemo(
    () => groupTransactionsByDate(transactions),
    [transactions],
  );

  return (
    <>
      <div className="mb-4">
        <MonthSelector
          month={month}
          year={year}
          onChange={handleMonthChange}
          accountCreatedAt={accountCreatedAt}
        />
      </div>

      {/* Summary strip */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-white/60">
        <span>
          Income{" "}
          <span className="text-[#10B981]">{formatMYR(summary.income)}</span>
        </span>
        <span className="text-white/20">·</span>
        <span>
          Expenses{" "}
          <span className="text-[#F43F5E]">{formatMYR(summary.expense)}</span>
        </span>
        <span className="text-white/20">·</span>
        <span>
          Net{" "}
          <span
            className={
              summary.net >= 0 ? "text-[#10B981]" : "text-[#F43F5E]"
            }
          >
            {formatMYR(summary.net)}
          </span>
        </span>
      </div>

      {loadingMonth && (
        <p className="mb-4 text-center text-xs text-white/40">Loading…</p>
      )}

      {transactions.length === 0 && !loadingMonth ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0F2044]/50 px-6 py-16 text-center">
          <h2 className="text-base font-medium text-white">
            No transactions in {MONTH_NAMES[month - 1]} {year}
          </h2>
          <p className="mt-1 text-sm text-white/50">Tap + to add one</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => {
            // Daily total: + income - expense (signed)
            let dailyNet = 0;
            for (const t of g.transactions) {
              const v = parseFloat(t.amount);
              if (!Number.isFinite(v)) continue;
              if (t.type === "income") dailyNet += v;
              else if (t.type === "expense") dailyNet -= v;
            }
            return (
              <div key={g.date}>
                <div className="mb-2 flex items-center gap-3">
                  <p className="text-xs font-medium text-white/60">
                    {g.label}
                  </p>
                  <div className="h-px flex-1 bg-white/10" />
                  <p className="text-xs text-white/40">
                    {dailyNet >= 0 ? "+" : "−"}
                    {formatMYR(Math.abs(dailyNet))}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  {g.transactions.map((t) => (
                    <TransactionRow
                      key={t.id}
                      transaction={t}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Fab onClick={() => setModalOpen(true)} hidden={modalOpen} />

      <TransactionModal
        open={modalOpen}
        mode={editing ? "edit" : "create"}
        initialData={editing ?? undefined}
        onSave={editing ? handleUpdate : handleAdd}
        onDelete={editing ? handleDelete : undefined}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
      />

      <Toast {...toast} />
    </>
  );
}
