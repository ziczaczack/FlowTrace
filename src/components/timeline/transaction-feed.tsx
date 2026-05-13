"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { isToday, isYesterday, parseISO } from "date-fns";
import { Fab } from "@/components/ui/fab";
import { TransactionModal } from "@/components/ui/transaction-modal";
import { Toast } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import { MonthSelector } from "@/components/timeline/month-selector";
import { TransactionRow } from "@/components/timeline/transaction-row";
import { groupTransactionsByDate, formatMYR } from "@/lib/utils";
import type { Transaction } from "@/types/database";
import type { NewTransaction } from "@/types/forms";
import { useT, useLocale, formatDate as fmtDate } from "@/lib/i18n";

type Props = {
  initialTransactions: Transaction[];
  month: number;
  year: number;
  userId: string;
  defaultLedgerId: string;
  accountCreatedAt?: string | null;
};

export function TransactionFeed({
  initialTransactions,
  month: initialMonth,
  year: initialYear,
  defaultLedgerId,
  accountCreatedAt,
}: Props) {
  const t = useT();
  const locale = useLocale();
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
    const removed = transactions.find((t) => t.id === id);
    const snapshot = transactions;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Failed to delete");
      }
      if (removed) {
        showToast("Transaction deleted", "success", {
          duration: 5000,
          action: {
            label: "Undo",
            onAction: () => undoDelete(removed),
          },
        });
      } else {
        showToast("Transaction deleted", "success");
      }
    } catch (e) {
      setTransactions(snapshot);
      showToast(
        e instanceof Error ? e.message : "Failed to delete transaction",
        "error",
      );
      throw e;
    }
  }

  async function undoDelete(removed: Transaction) {
    // Re-insert optimistically so the row reappears immediately.
    setTransactions((prev) => {
      if (prev.some((t) => t.id === removed.id)) return prev;
      return [removed, ...prev];
    });
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ledgerId: removed.ledger_id,
          amount: parseFloat(removed.amount),
          type: removed.type,
          categoryId: removed.category_id,
          paymentMethod: removed.payment_method ?? undefined,
          note: removed.note ?? undefined,
          txnDate: removed.txn_date,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Failed to restore transaction");
      }
      await loadMonth(month, year);
      showToast("Transaction restored", "success");
    } catch (e) {
      setTransactions((prev) => prev.filter((t) => t.id !== removed.id));
      showToast(
        e instanceof Error ? e.message : "Failed to restore transaction",
        "error",
      );
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

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter((t) => {
      const inNote = t.note?.toLowerCase().includes(q);
      const inCategory = t.category?.name?.toLowerCase().includes(q);
      const inAmount = t.amount.includes(q);
      return inNote || inCategory || inAmount;
    });
  }, [transactions, searchQuery]);

  const groups = useMemo(
    () =>
      groupTransactionsByDate(filteredTransactions, (iso) => {
        const d = parseISO(iso);
        if (isToday(d)) return t("common.today");
        if (isYesterday(d)) return t("common.yesterday");
        return fmtDate(d, locale, {
          weekday: "short",
          day: "numeric",
          month: "short",
        });
      }),
    [filteredTransactions, t, locale],
  );

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <MonthSelector
          month={month}
          year={year}
          onChange={handleMonthChange}
          accountCreatedAt={accountCreatedAt}
        />
        {/* Search */}
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("commandPalette.placeholder")}
            className="w-full rounded-xl border border-border bg-surface-muted/70 py-2 pl-9 pr-8 text-sm text-foreground outline-none transition-colors placeholder:text-subtle-foreground focus:border-primary focus:ring-2 focus:ring-[var(--ring)] sm:w-52"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle-foreground hover:text-foreground cursor-pointer"
              aria-label={t("common.close")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Summary card */}
      <div className="glass-card mb-6 grid grid-cols-3 gap-3 rounded-2xl px-5 py-4 text-center">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-subtle-foreground">
            {t("common.income")}
          </p>
          <p className="mt-1 text-sm font-semibold text-positive tabular-nums">
            {formatMYR(summary.income)}
          </p>
        </div>
        <div className="border-x border-border">
          <p className="text-[10px] font-medium uppercase tracking-wide text-subtle-foreground">
            {t("common.expenses")}
          </p>
          <p className="mt-1 text-sm font-semibold text-negative tabular-nums">
            {formatMYR(summary.expense)}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-subtle-foreground">
            {t("common.net")}
          </p>
          <p
            className={`mt-1 text-sm font-semibold tabular-nums ${
              summary.net >= 0 ? "text-positive" : "text-negative"
            }`}
          >
            {formatMYR(summary.net)}
          </p>
        </div>
      </div>

      {loadingMonth && (
        <p className="mb-4 text-center text-xs text-subtle-foreground">
          {t("common.loading")}
        </p>
      )}

      {filteredTransactions.length === 0 && !loadingMonth ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
          {searchQuery ? (
            <>
              <h2 className="text-base font-semibold text-foreground">
                {t("commandPalette.empty")}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                &ldquo;{searchQuery}&rdquo;
              </p>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-foreground">
                {t("timeline.noTransactions")}
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {fmtDate(new Date(year, month - 1, 1), locale, {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-3 sm:p-4">
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
                  <div className="mb-2 flex items-center gap-3 px-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {g.label}
                    </p>
                    <div className="h-px flex-1 bg-border" />
                    <p
                      className={`text-xs font-medium tabular-nums ${
                        dailyNet >= 0 ? "text-positive" : "text-negative"
                      }`}
                    >
                      {dailyNet >= 0 ? "+" : "−"}
                      {formatMYR(Math.abs(dailyNet))}
                    </p>
                  </div>
                  <div className="flex flex-col gap-0.5">
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
