"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sparkles, Zap } from "lucide-react";
import type { Category } from "@/types/database";
import { parseQuickAdd, type ParsedEntry } from "@/lib/nl-parser";

type Props = {
  ledgerId: string;
  categories: Category[];
};

const EXAMPLES = [
  "25 coffee",
  "lunch 15 yesterday",
  "+2500 salary",
  "100 groceries monday",
];

function formatMYR(n: number) {
  return n.toLocaleString("en-MY", { style: "currency", currency: "MYR" });
}

function friendlyDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff <= 7) return `${diff} days ago`;
  return target.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
  });
}

export function QuickAddBar({ ledgerId, categories }: Props) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "saving" } | { kind: "success" } | { kind: "error"; msg: string }
  >({ kind: "idle" });
  const [placeholder, setPlaceholder] = useState(EXAMPLES[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Rotate placeholder examples so users discover what they can type.
  useEffect(() => {
    let idx = 0;
    const int = window.setInterval(() => {
      idx = (idx + 1) % EXAMPLES.length;
      setPlaceholder(EXAMPLES[idx]);
    }, 3200);
    return () => window.clearInterval(int);
  }, []);

  // Focus input when `/` is pressed globally.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const parsed = useMemo<ParsedEntry | null>(
    () => parseQuickAdd(value, categories),
    [value, categories],
  );

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!parsed) return;
    setStatus({ kind: "saving" });
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ledgerId,
          amount: parsed.amount,
          type: parsed.type,
          categoryId: parsed.categoryId,
          note: parsed.note,
          paymentMethod: "cash",
          txnDate: parsed.txnDate,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Failed");
      }
      setStatus({ kind: "success" });
      setValue("");
      router.refresh();
      setTimeout(() => setStatus({ kind: "idle" }), 1400);
    } catch (err) {
      setStatus({
        kind: "error",
        msg: err instanceof Error ? err.message : "Failed to save",
      });
      setTimeout(() => setStatus({ kind: "idle" }), 2800);
    }
  }

  const canSubmit = parsed !== null && status.kind !== "saving";

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
            <Zap className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Quick add
            </p>
            <p className="text-[11px] text-muted-foreground">
              Type naturally. We&apos;ll parse it for you.
            </p>
          </div>
        </div>
        <kbd className="hidden rounded border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-subtle-foreground sm:inline-block">
          /
        </kbd>
      </div>

      <form onSubmit={submit}>
        <div className="relative">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`e.g. ${placeholder}`}
            className="w-full rounded-xl border border-border bg-surface px-4 py-3 pr-32 text-sm text-foreground outline-none placeholder:text-subtle-foreground focus:border-primary focus:ring-2 focus:ring-[var(--ring)]"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="submit"
            disabled={!canSubmit}
            className={[
              "absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              canSubmit
                ? "bg-primary text-primary-fg shadow-sm hover:bg-primary-hover"
                : "cursor-not-allowed bg-surface-muted text-subtle-foreground",
            ].join(" ")}
          >
            {status.kind === "saving"
              ? "Saving…"
              : status.kind === "success"
                ? "Saved ✓"
                : "Add ↵"}
          </button>
        </div>
      </form>

      {/* Preview chip */}
      <div className="mt-3 min-h-[36px]">
        {parsed ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium"
              style={{
                background: parsed.categoryColor
                  ? `${parsed.categoryColor}22`
                  : "var(--surface-muted)",
                color: parsed.categoryColor ?? "var(--foreground)",
              }}
            >
              <span>{parsed.categoryIcon ?? "📦"}</span>
              {parsed.categoryName}
            </span>
            <span
              className={[
                "rounded-full px-2.5 py-1 font-semibold amount-sensitive tabular-nums",
                parsed.type === "income"
                  ? "bg-[var(--positive-soft)] text-positive"
                  : "bg-[var(--negative-soft)] text-negative",
              ].join(" ")}
            >
              {parsed.type === "income" ? "+" : "−"}
              {formatMYR(parsed.amount)}
            </span>
            <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-muted-foreground">
              {friendlyDate(parsed.txnDate)}
            </span>
            {parsed.note && (
              <span className="rounded-full border border-border bg-surface px-2.5 py-1 italic text-muted-foreground">
                &ldquo;{parsed.note}&rdquo;
              </span>
            )}
            <span
              className={[
                "ml-auto flex items-center gap-1 text-[10px] uppercase tracking-wider",
                parsed.confidence === "high"
                  ? "text-positive"
                  : parsed.confidence === "medium"
                    ? "text-warning"
                    : "text-subtle-foreground",
              ].join(" ")}
            >
              <Sparkles className="h-3 w-3" aria-hidden />
              {parsed.confidence} confidence
            </span>
          </div>
        ) : value.trim() ? (
          <p className="text-xs text-subtle-foreground">
            Need at least a number. Try <em>&ldquo;25 coffee&rdquo;</em> or{" "}
            <em>&ldquo;+500 salary&rdquo;</em>.
          </p>
        ) : (
          <p className="text-xs text-subtle-foreground">
            Tip: press <kbd className="rounded border border-border bg-surface px-1 py-0.5 text-[10px]">/</kbd>{" "}
            anywhere to focus this bar.
          </p>
        )}
      </div>

      {status.kind === "error" && (
        <p className="mt-2 text-xs text-negative">{status.msg}</p>
      )}
      {status.kind === "success" && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-positive">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          Added to your ledger.
        </p>
      )}
    </div>
  );
}
