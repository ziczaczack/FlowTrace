"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Category,
  ExtractedReceipt,
  PaymentMethod,
  Transaction,
  TransactionType,
} from "@/types/database";
import type { NewTransaction } from "@/types/forms";
import { ReceiptScanner } from "@/components/ui/receipt-scanner";
import { Toast } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";
import {
  useT,
  useLocale,
  formatDate as fmtDate,
  translateCategoryName,
} from "@/lib/i18n";

type Mode = "create" | "edit";

type TransactionModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (data: NewTransaction) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialData?: Transaction;
  mode: Mode;
};

const PAYMENT_METHODS: { id: string; labelKey: string }[] = [
  { id: "cash", labelKey: "modal.paymentCash" },
  { id: "card", labelKey: "modal.paymentCard" },
  { id: "e-wallet", labelKey: "modal.paymentEWallet" },
  { id: "bank_transfer", labelKey: "modal.paymentBankTransfer" },
];

const TYPE_OPTIONS: {
  id: TransactionType;
  labelKey: string;
  active: string;
}[] = [
  {
    id: "income",
    labelKey: "common.income",
    active: "bg-positive border-positive text-white",
  },
  {
    id: "expense",
    labelKey: "common.expense",
    active: "bg-negative border-negative text-white",
  },
  {
    id: "transfer",
    labelKey: "common.transfer",
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


export function TransactionModal({
  open,
  onClose,
  onSave,
  onDelete,
  initialData,
  mode,
}: TransactionModalProps) {
  const t = useT();
  const locale = useLocale();

  function formatDateLabel(iso: string): string {
    const [y, m, d] = iso.split("-").map(Number);
    if (!y || !m || !d) return iso;
    const date = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.getTime() === today.getTime()) return t("common.today");
    if (date.getTime() === yesterday.getTime()) return t("common.yesterday");
    return fmtDate(date, locale, {
      weekday: "short",
      day: "2-digit",
      month: "short",
    });
  }

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
  const [autoFilled, setAutoFilled] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  // Batch scan queue: when N receipts are scanned at once, we apply the
  // first to the form and stash the rest. After each save we shift to the
  // next entry until the queue is drained — only then does the modal close.
  const [scanQueue, setScanQueue] = useState<ExtractedReceipt[]>([]);
  const [scanIndex, setScanIndex] = useState(0);
  const [scanTotal, setScanTotal] = useState(0);
  const { toast, showToast } = useToast();

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
    // Drop any leftover scan queue when (re)opening — a fresh open should
    // never inherit a half-consumed batch from a previous session.
    setScanQueue([]);
    setScanIndex(0);
    setScanTotal(0);
    setAutoFilled(false);
    setShowAllCategories(false);
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
      if (e.key === "Escape") handleClose();
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

  // Pin the selected category to the head of the list so it remains visible
  // even when the rest is collapsed behind "Show more".
  const orderedCategories = useMemo(() => {
    if (!categoryId) return visibleCategories;
    const selected = visibleCategories.find((c) => c.id === categoryId);
    if (!selected) return visibleCategories;
    return [selected, ...visibleCategories.filter((c) => c.id !== categoryId)];
  }, [visibleCategories, categoryId]);

  const COLLAPSED_LIMIT = 8;
  const overflowCount = Math.max(0, orderedCategories.length - COLLAPSED_LIMIT);
  const renderedCategories =
    showAllCategories || overflowCount === 0
      ? orderedCategories
      : orderedCategories.slice(0, COLLAPSED_LIMIT);

  const canSave = amountValid && Boolean(categoryId) && !submitting;

  function applyReceipt(data: ExtractedReceipt) {
    if (data.amount != null && Number.isFinite(data.amount)) {
      setAmountInput(String(data.amount));
    } else {
      setAmountInput("");
    }
    if (data.date) setTxnDate(data.date);
    if (data.paymentMethod) {
      const allowed: PaymentMethod[] = [
        "cash",
        "card",
        "e-wallet",
        "bank_transfer",
      ];
      if ((allowed as string[]).includes(data.paymentMethod)) {
        setPaymentMethod(data.paymentMethod);
      }
    }
    setNote(data.note ?? "");
    if (data.category) {
      const target = data.category.trim().toLowerCase();
      const match = categories.find(
        (c) => c.name.trim().toLowerCase() === target,
      );
      if (match) setCategoryId(match.id);
    }
    setType("expense");
    setAutoFilled(true);
    setTimeout(() => setAutoFilled(false), 3000);
  }

  function handleExtracted(items: ExtractedReceipt[]) {
    if (items.length === 0) return;
    const [first, ...rest] = items;
    applyReceipt(first);
    setScanQueue(rest);
    setScanIndex(1);
    setScanTotal(items.length);
    showToast(
      items.length > 1
        ? `${items.length} receipts scanned`
        : "Receipt scanned",
      "success",
    );
  }

  function advanceQueue() {
    setScanQueue((prev) => {
      if (prev.length === 0) return prev;
      const [next, ...rest] = prev;
      applyReceipt(next);
      setScanIndex((i) => i + 1);
      return rest;
    });
  }

  function clearQueue() {
    setScanQueue([]);
    setScanIndex(0);
    setScanTotal(0);
  }

  function handleScanError(message: string) {
    showToast(message, "error");
  }

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
      // If there are still receipts queued from a batch scan, advance to
      // the next one instead of closing the modal.
      if (scanQueue.length > 0) {
        advanceQueue();
      } else {
        clearQueue();
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    clearQueue();
    onClose();
  }

  async function handleDelete() {
    if (!initialData || !onDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await onDelete(initialData.id);
      handleClose();
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
        onClick={handleClose}
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

        {/* Header actions: receipt scanner + close */}
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <ReceiptScanner
            onExtracted={handleExtracted}
            onError={handleScanError}
          />
          <button
            type="button"
            onClick={handleClose}
            aria-label={t("common.close")}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/60 text-foreground transition-colors hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

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
            <p className="mt-1 text-xs text-negative">{t("modal.amount")}</p>
          )}
          <div className="mt-1 flex items-center justify-center gap-2">
            {autoFilled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-500 transition-opacity duration-300">
                ✓ Auto-filled
              </span>
            )}
            {scanTotal > 1 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                Receipt {scanIndex} of {scanTotal}
              </span>
            )}
            {scanQueue.length > 0 && (
              <button
                type="button"
                onClick={advanceQueue}
                className="cursor-pointer rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
              >
                Skip →
              </button>
            )}
          </div>
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
                {t(opt.labelKey)}
              </button>
            );
          })}
        </div>

        {/* Category grid */}
        <div className="mb-5">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
            {t("modal.category")}
          </p>
          {categoriesLoading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : visibleCategories.length === 0 ? (
            <p className="text-sm text-subtle-foreground">
              {t("modal.selectCategory")}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {renderedCategories.map((c) => {
                  const isSelected = c.id === categoryId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategoryId(c.id)}
                      className={[
                        "flex min-w-0 cursor-pointer items-center gap-1.5 rounded-full border-2 px-3 py-1.5 text-sm transition-colors duration-200",
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
                      <span aria-hidden className="shrink-0">
                        {c.icon}
                      </span>
                      <span className="truncate">
                        {translateCategoryName(c.name, t)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {overflowCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllCategories((s) => !s)}
                  className="mt-2 cursor-pointer text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showAllCategories
                    ? locale === "zh-CN"
                      ? "收起"
                      : "Show fewer"
                    : locale === "zh-CN"
                      ? `展开 ${overflowCount} 项`
                      : `Show ${overflowCount} more`}
                </button>
              )}
            </>
          )}
        </div>

        {/* Payment method */}
        <div className="mb-5">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
            {t("modal.paymentMethod")}
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
                  {t(m.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date */}
        <div className="mb-5 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
            {t("modal.date")}
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
            aria-label={t("modal.date")}
          />
        </div>

        {/* Note */}
        <div className="mb-5">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("modal.notePlaceholder")}
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
            {submitting
              ? t("common.saving")
              : mode === "edit"
                ? t("common.save")
                : scanQueue.length > 0
                  ? `${t("common.save")} →`
                  : t("common.save")}
          </button>

          <Toast {...toast} />
          {mode === "edit" && initialData && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full cursor-pointer rounded-xl border border-negative px-4 py-3 text-sm font-semibold text-negative transition-colors duration-200 hover:bg-[var(--negative-soft)] disabled:opacity-50"
            >
              {deleting ? t("common.loading") : t("common.delete")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
