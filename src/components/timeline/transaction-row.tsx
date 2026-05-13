"use client";

import { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import type { Transaction } from "@/types/database";
import { formatMYR } from "@/lib/utils";
import { useT, useLocale, translateCategoryName } from "@/lib/i18n";

type Props = {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
  onDelete: (id: string) => Promise<void> | void;
};

function paymentLabelKey(method: string): string {
  switch (method) {
    case "cash":
      return "modal.paymentCash";
    case "card":
      return "modal.paymentCard";
    case "e-wallet":
      return "modal.paymentEWallet";
    case "bank_transfer":
      return "modal.paymentBankTransfer";
    default:
      return "";
  }
}

function formatTime(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const bcp = locale === "zh-CN" ? "zh-CN" : "en-MY";
  return d.toLocaleTimeString(bcp, {
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
    return { text: `+${formatted}`, className: "text-positive" };
  }
  if (t.type === "expense") {
    return { text: `−${formatted}`, className: "text-negative" };
  }
  return { text: `→${formatted}`, className: "text-foreground" };
}

export function TransactionRow({ transaction, onEdit, onDelete }: Props) {
  const t = useT();
  const locale = useLocale();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  function triggerDelete() {
    void onDelete(transaction.id);
  }

  function startLongPress() {
    longPressed.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressed.current = true;
      triggerDelete();
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
    onEdit(transaction);
  }

  const cat = transaction.category;
  const color = cat?.color ?? "#6B7280";
  const icon = cat?.icon ?? "📦";
  const name = cat?.name ? translateCategoryName(cat.name, t) : t("category.other");
  const paymentKey = transaction.payment_method
    ? paymentLabelKey(transaction.payment_method)
    : "";
  const paymentLabel = paymentKey
    ? t(paymentKey)
    : transaction.payment_method ?? null;
  const amt = amountDisplay(transaction);

  return (
    <div className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors duration-200 hover:bg-surface-muted">
      {/* Icon */}
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[18px]"
        style={{
          backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)`,
          color,
        }}
        aria-hidden
      >
        {icon}
      </div>

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
          <p className="truncate text-sm font-medium text-foreground">
            {name}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {transaction.note ? (
              <>
                <span>{transaction.note}</span>
                {paymentLabel && (
                  <span className="text-subtle-foreground">
                    {" "}
                    · {paymentLabel}
                  </span>
                )}
              </>
            ) : paymentLabel ? (
              <span className="text-subtle-foreground">{paymentLabel}</span>
            ) : null}
          </p>
        </div>

        {/* Right */}
        <div className="shrink-0 text-right">
          <p
            className={`text-[15px] font-semibold tabular-nums ${amt.className}`}
          >
            {amt.text}
          </p>
          <p className="text-[11px] text-subtle-foreground tabular-nums">
            {formatTime(transaction.created_at, locale)}
          </p>
        </div>

        {/* Trash — always visible on touch devices (low opacity), hover-only on desktop. */}
        <button
          type="button"
          aria-label={t("common.delete")}
          onClick={(e) => {
            e.stopPropagation();
            triggerDelete();
          }}
          className="ml-1 inline-flex cursor-pointer rounded-lg p-1.5 text-subtle-foreground opacity-50 transition-opacity duration-200 hover:bg-surface-strong hover:text-foreground md:opacity-0 md:group-hover:opacity-100"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
