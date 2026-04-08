"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Category, Transaction, TransactionType } from "@/types/database";
import type { NewTransaction } from "@/types/forms";

type Mode = "create" | "edit";

type TransactionModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: NewTransaction) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialData?: Transaction;
  mode: Mode;
};

const PAYMENT_METHODS: { id: string; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "e-wallet", label: "E-wallet" },
  { id: "bank_transfer", label: "Bank transfer" },
];

const TYPE_OPTIONS: {
  id: TransactionType;
  label: string;
  active: string;
}[] = [
  {
    id: "income",
    label: "Income",
    active: "bg-positive border-positive text-white",
  },
  {
    id: "expense",
    label: "Expense",
    active: "bg-negative border-negative text-white",
  },
  {
    id: "transfer",
    label: "Transfer",
    active: "bg-accent border-accent text-white",
  },
];

/** Safely evaluate a tiny arithmetic expression like "10+5" or "1.5*3". */
function evaluateAmount(input: string): number {
  const cleaned = input.trim().replace(/\s+/g, "");
  if (!cleaned) return 0;
  // Allow only digits, dot, and + - * /
  if (!/^[0-9+\-*/.]+$/.test(cleaned)) return NaN;
  // Reject leading operators that aren't a unary minus we don't support.
  if (/[+\-*/]{2,}/.test(cleaned)) return NaN;
  try {
    const value = Function(`"use strict"; return (${cleaned});`)();
    return typeof value === "number" && Number.isFinite(value) ? value : NaN;
  } catch {
    return NaN;
  }
}

function todayIso(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDateLabel(iso: string): string {
  // iso is YYYY-MM-DD; treat as a local calendar date.
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.getTime() === today.getTime()) return "Today";
  if (date.getTime() === yesterday.getTime()) return "Yesterday";

  return date.toLocaleDateString("en-MY", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function TransactionModal({
  open,
  onClose,
  onSave,
  onDelete,
  initialData,
  mode,
}: TransactionModalProps) {
  const [amountInput, setAmountInput] = useState<string>(
    initialData ? String(parseFloat(initialData.amount)) : "",
  );
  const [type, setType] = useState<TransactionType>(
    initialData?.type ?? "expense",
  );
  const [categoryId, setCategoryId] = useState<string>(
    initialData?.category_id ?? "",
  );
  const [paymentMethod, setPaymentMethod] = useState<string>(
    initialData?.payment_method ?? "cash",
  );
  const [txnDate, setTxnDate] = useState<string>(
    initialData?.txn_date ?? todayIso(),
  );
  const [note, setNote] = useState<string>(initialData?.note ?? "");

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateInputRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // Reset form when (re)opening in create mode or when switching record.
  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setAmountInput(String(parseFloat(initialData.amount)));
      setType(initialData.type);
      setCategoryId(initialData.category_id ?? "");
      setPaymentMethod(initialData.payment_method ?? "cash");
      setTxnDate(initialData.txn_date);
      setNote(initialData.note ?? "");
    } else {
      setAmountInput("");
      setType("expense");
      setCategoryId("");
      setPaymentMethod("cash");
      setTxnDate(todayIso());
      setNote("");
    }
    setError(null);
    // Auto-focus amount on open.
    requestAnimationFrame(() => amountRef.current?.focus());
  }, [open, initialData]);

  // Fetch categories on mount/open.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setCategoriesLoading(true);
    fetch("/api/categories")
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (res.error) setError(res.error);
        else setCategories(res.data ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? "Failed to load categories");
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // ESC closes the modal.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const evaluatedAmount = useMemo(() => evaluateAmount(amountInput), [amountInput]);
  const amountValid = Number.isFinite(evaluatedAmount) && evaluatedAmount > 0;

  // Filter categories to ones matching the selected type. For transfers we
  // show all expense categories as a default since transfers don't strictly
  // belong to either side.
  const visibleCategories = useMemo(() => {
    if (type === "income") return categories.filter((c) => c.type === "income");
    return categories.filter((c) => c.type === "expense");
  }, [categories, type]);

  const canSave = amountValid && Boolean(categoryId) && !submitting;

  async function handleSave() {
    if (!canSave) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSave({
        amount: evaluatedAmount,
        type,
        categoryId,
        paymentMethod,
        note: note.trim() || undefined,
        txnDate,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initialData || !onDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(initialData.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      aria-hidden={!open}
      className={[
        "fixed inset-0 z-40 transition-opacity",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      ].join(" ")}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />

      {/* Sheet / Modal */}
      <div
        role="dialog"
        aria-modal="true"
        className={[
          "glass-card-strong absolute left-0 right-0 bottom-0 mx-auto w-full max-w-lg rounded-t-3xl p-6",
          "transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full",
          "md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl",
          open ? "md:translate-y-[-50%]" : "md:translate-y-[100%]",
        ].join(" ")}
      >
        {/* Drag indicator on mobile */}
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-border-strong md:hidden" />

        {/* Amount */}
        <div className="mb-6 text-center">
          <input
            ref={amountRef}
            inputMode="decimal"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="RM 0.00"
            className="w-full bg-transparent text-center text-[44px] font-semibold tracking-tight text-foreground tabular-nums placeholder:text-subtle-foreground outline-none"
          />
          {amountInput && !amountValid && (
            <p className="mt-1 text-xs text-negative">Enter a valid amount</p>
          )}
        </div>

        {/* Type selector */}
        <div className="mb-5 grid grid-cols-3 gap-2">
          {TYPE_OPTIONS.map((opt) => {
            const isActive = type === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setType(opt.id)}
                className={[
                  "cursor-pointer rounded-full border px-3 py-2 text-sm font-medium transition-colors duration-200",
                  isActive
                    ? opt.active
                    : "border-border bg-surface-muted text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Category grid */}
        <div className="mb-5">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
            Category
          </p>
          {categoriesLoading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {visibleCategories.map((c) => {
                const isSelected = c.id === categoryId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategoryId(c.id)}
                    className={[
                      "flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm transition-colors duration-200",
                      isSelected
                        ? "bg-surface-muted text-foreground"
                        : "border-border bg-transparent text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                    ].join(" ")}
                    style={
                      isSelected && c.color
                        ? { borderColor: c.color }
                        : undefined
                    }
                  >
                    <span aria-hidden>{c.icon}</span>
                    <span>{c.name}</span>
                  </button>
                );
              })}
              {visibleCategories.length === 0 && (
                <p className="text-sm text-subtle-foreground">
                  No categories — visit /api/seed in dev to seed defaults.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Payment method */}
        <div className="mb-5">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
            Payment
          </p>
          <div className="grid grid-cols-4 gap-2">
            {PAYMENT_METHODS.map((m) => {
              const active = paymentMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={[
                    "cursor-pointer rounded-full border px-2 py-1.5 text-xs font-medium transition-colors duration-200",
                    active
                      ? "border-primary bg-[var(--positive-soft)] text-foreground"
                      : "border-border bg-surface-muted text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date */}
        <div className="mb-5 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
            Date
          </p>
          <button
            type="button"
            onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
            className="cursor-pointer rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface-strong"
          >
            {formatDateLabel(txnDate)}
          </button>
          <input
            ref={dateInputRef}
            type="date"
            value={txnDate}
            onChange={(e) => setTxnDate(e.target.value)}
            className="sr-only"
            aria-label="Transaction date"
          />
        </div>

        {/* Note */}
        <div className="mb-5">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note..."
            className="w-full rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-sm text-foreground placeholder:text-subtle-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>

        {error && (
          <p className="mb-3 text-sm text-negative" role="alert">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-fg shadow-sm transition-colors duration-200 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" fill="currentColor" className="opacity-75" />
              </svg>
            )}
            {mode === "edit" ? "Save changes" : "Save"}
          </button>

          {mode === "edit" && initialData && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full cursor-pointer rounded-xl border border-negative px-4 py-3 text-sm font-semibold text-negative transition-colors duration-200 hover:bg-[var(--negative-soft)] disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
