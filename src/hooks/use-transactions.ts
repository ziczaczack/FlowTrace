"use client";

import { useCallback, useEffect, useState } from "react";
import type { Transaction } from "@/types/database";
import type { NewTransaction } from "@/types/forms";

type ApiResponse<T> = { data: T | null; error: string | null };

export function useTransactions(ledgerId: string | null) {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!ledgerId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        ledgerId,
        month: String(currentMonth),
        year: String(currentYear),
      });
      const res = await fetch(`/api/transactions?${params.toString()}`);
      const json: ApiResponse<Transaction[]> = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Failed to load transactions");
      }
      setTransactions(json.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [ledgerId, currentMonth, currentYear]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const add = useCallback(
    async (data: NewTransaction) => {
      if (!ledgerId) throw new Error("No ledger");
      // Optimistic insert with a temporary id.
      const tempId = `temp-${Date.now()}`;
      const optimistic: Transaction = {
        id: tempId,
        ledger_id: ledgerId,
        category_id: data.categoryId,
        recurring_rule_id: null,
        transfer_pair_id: null,
        amount: data.amount.toFixed(2),
        type: data.type,
        payment_method: (data.paymentMethod as Transaction["payment_method"]) ?? null,
        note: data.note ?? null,
        txn_date: data.txnDate,
        created_at: new Date().toISOString(),
        category: null,
      };
      setTransactions((prev) => [optimistic, ...prev]);

      try {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ledgerId, ...data }),
        });
        const json: ApiResponse<Transaction> = await res.json();
        if (!res.ok || json.error || !json.data) {
          throw new Error(json.error ?? "Failed to add");
        }
        // Replace optimistic row with the real one.
        setTransactions((prev) =>
          prev.map((t) => (t.id === tempId ? (json.data as Transaction) : t)),
        );
        // Refetch in the background to pull joined category data.
        fetchTransactions();
      } catch (e) {
        // Rollback.
        setTransactions((prev) => prev.filter((t) => t.id !== tempId));
        throw e;
      }
    },
    [ledgerId, fetchTransactions],
  );

  const update = useCallback(
    async (id: string, data: Partial<NewTransaction>) => {
      let snapshot: Transaction | undefined;
      setTransactions((prev) => {
        snapshot = prev.find((t) => t.id === id);
        return prev.map((t) =>
          t.id === id
            ? {
                ...t,
                amount: data.amount !== undefined ? data.amount.toFixed(2) : t.amount,
                type: data.type ?? t.type,
                category_id: data.categoryId ?? t.category_id,
                payment_method:
                  (data.paymentMethod as Transaction["payment_method"]) ??
                  t.payment_method,
                note: data.note ?? t.note,
                txn_date: data.txnDate ?? t.txn_date,
              }
            : t,
        );
      });

      try {
        const res = await fetch(`/api/transactions/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json: ApiResponse<Transaction> = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error ?? "Failed to update");
        }
        fetchTransactions();
      } catch (e) {
        if (snapshot) {
          const restored = snapshot;
          setTransactions((prev) => prev.map((t) => (t.id === id ? restored : t)));
        }
        throw e;
      }
    },
    [fetchTransactions],
  );

  const remove = useCallback(
    async (id: string) => {
      let snapshot: Transaction | undefined;
      setTransactions((prev) => {
        snapshot = prev.find((t) => t.id === id);
        return prev.filter((t) => t.id !== id);
      });

      try {
        const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
        const json: ApiResponse<{ id: string }> = await res.json();
        if (!res.ok || json.error) {
          throw new Error(json.error ?? "Failed to delete");
        }
      } catch (e) {
        if (snapshot) {
          const restored = snapshot;
          setTransactions((prev) => [restored, ...prev]);
        }
        throw e;
      }
    },
    [],
  );

  const setMonth = useCallback((month: number, year: number) => {
    setCurrentMonth(month);
    setCurrentYear(year);
  }, []);

  return {
    transactions,
    loading,
    error,
    add,
    update,
    remove,
    setMonth,
    currentMonth,
    currentYear,
    refetch: fetchTransactions,
  };
}
