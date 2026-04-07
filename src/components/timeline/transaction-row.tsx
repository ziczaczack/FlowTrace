"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import type { Transaction } from "@/types/database";
import { formatMYR } from "@/lib/utils";

type Props = {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => Promise<void>;
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  "e-wallet": "E-wallet",
  bank_transfer: "Bank transfer",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-MY", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function amountDisplay(t: Transaction): {
  text: string;
  className: string;
} {
  const value = parseFloat(t.amount);
  const formatted = formatMYR(Number.isFinite(value) ? value : 0);
  if (t.type === "income") {
    return { text: `+${formatted}`, className: "text-[#10B981]" };
  }
  if (t.type === "expense") {
    return { text: `−${formatted}`, className: "text-[#F43F5E]" };
  }
  return { text: `→${formatted}`, className: "text-white" };
}

export function TransactionRow({ transaction, onEdit, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removed, setRemoved] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  function startLongPress() {
    longPressed.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      setConfirming(true);
    }, 500);
  }
  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleClick() {
    if (longPressed.current) {
      longPressed.current = false;
      return;
    }
    if (confirming) return;
    onEdit(transaction);
  }

  async function handleConfirmDelete() {
    setDeleting(true);
    try {
      await onDelete(transaction.id);
      setRemoved(true);
    } catch {
      setDeleting(false);
      setConfirming(false);
    }
  }

  const cat = transaction.category;
  const color = cat?.color ?? "#6B7280";
  const icon = cat?.icon ?? "📦";
  const name = cat?.name ?? "Uncategorised";
  const paymentLabel = transaction.payment_method
    ? PAYMENT_LABELS[transaction.payment_method] ?? transaction.payment_method
    : null;
  const amt = amountDisplay(transaction);

  return (
    <div
      className={[
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all",
        "hover:bg-white/5",
        removed ? "pointer-events-none opacity-0" : "opacity-100",
      ].join(" ")}
      style={{ transitionDuration: removed ? "300ms" : undefined }}
    >
      {/* Icon */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[18px]"
        style={{ backgroundColor: `${color}33` }}
        aria-hidden
      >
        {icon}
      </div>

      {confirming ? (
        <div className="flex flex-1 items-center justify-between gap-3">
          <p className="text-sm text-white">Delete this transaction?</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="rounded-md px-2 py-1 text-xs font-medium text-white/60 hover:bg-white/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="rounded-md px-2 py-1 text-xs font-semibold text-[#F43F5E] hover:bg-[#F43F5E]/10 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
            }
          }}
          onTouchStart={startLongPress}
          onTouchEnd={cancelLongPress}
          onTouchMove={cancelLongPress}
          onTouchCancel={cancelLongPress}
          className="flex flex-1 cursor-pointer items-center gap-3 text-left"
        >
          {/* Middle */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <p className="truncate text-xs text-white/50">
              {transaction.note ? (
                <>
                  <span className="text-white/50">{transaction.note}</span>
                  {paymentLabel && (
                    <span className="text-white/40"> · {paymentLabel}</span>
                  )}
                </>
              ) : paymentLabel ? (
                <span className="text-white/40">{paymentLabel}</span>
              ) : null}
            </p>
          </div>

          {/* Right */}
          <div className="shrink-0 text-right">
            <p className={`text-[15px] font-semibold ${amt.className}`}>
              {amt.text}
            </p>
            <p className="text-[11px] text-white/40">
              {formatTime(transaction.created_at)}
            </p>
          </div>

          {/* Desktop hover trash */}
          <button
            type="button"
            aria-label="Delete transaction"
            onClick={(e) => {
              e.stopPropagation();
              setConfirming(true);
            }}
            className="ml-1 hidden rounded p-1 text-white/40 opacity-0 transition-opacity hover:bg-white/5 hover:text-white/70 group-hover:opacity-100 md:inline-flex"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
