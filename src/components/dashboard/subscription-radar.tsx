"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Repeat, X, Check } from "lucide-react";
import type { DetectedSubscription } from "@/lib/subscriptions";
import { Toast } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

type Props = { detections: DetectedSubscription[] };

const formatMYR = (n: number) =>
  n.toLocaleString("en-MY", { style: "currency", currency: "MYR" });

function formatDueDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (date.getTime() - today.getTime()) / 86_400_000,
  );
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "tomorrow";
  if (diffDays > 0 && diffDays < 7) return `in ${diffDays} days`;
  return date.toLocaleDateString("en-MY", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function SubscriptionRadar({ detections }: Props) {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<string | null>(null);

  const visible = detections.filter((d) => !dismissed.has(d.signature));
  if (visible.length === 0) return null;

  async function handleConfirm(d: DetectedSubscription) {
    setConfirming(d.signature);
    try {
      const res = await fetch("/api/recurring-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ledgerId: d.ledgerId,
          categoryId: d.categoryId,
          name: d.name,
          amount: d.amount,
          frequency: d.frequency,
          nextDue: d.predictedNextDue,
          linkAmount: d.amount,
          linkNote: d.name === d.categoryName ? null : d.name,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Failed to save rule");
      }
      showToast(`${d.name} saved as recurring`, "success");
      // Drop it from the visible list so the dashboard doesn't keep showing it.
      setDismissed((prev) => new Set(prev).add(d.signature));
      router.refresh();
    } catch (e) {
      showToast(
        e instanceof Error ? e.message : "Failed to save rule",
        "error",
      );
    } finally {
      setConfirming(null);
    }
  }

  function handleDismiss(d: DetectedSubscription) {
    setDismissed((prev) => new Set(prev).add(d.signature));
  }

  return (
    <>
      <section className="glass-card rounded-2xl p-5 sm:p-6">
        <header className="mb-4 flex items-center gap-2">
          <Repeat className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-subtle-foreground">
            Subscription radar
          </h2>
          <span className="ml-auto rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {visible.length} detected
          </span>
        </header>

        <ul className="flex flex-col gap-2">
          {visible.slice(0, 4).map((d) => {
            const busy = confirming === d.signature;
            return (
              <li
                key={d.signature}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface/60 px-3 py-2.5"
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                  style={{
                    backgroundColor: `color-mix(in oklab, ${d.categoryColor} 18%, transparent)`,
                    color: d.categoryColor,
                  }}
                  aria-hidden
                >
                  {d.categoryIcon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {d.name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {d.frequency === "monthly" ? "Monthly" : "Weekly"} ·{" "}
                    {d.occurrenceCount} times · next ~
                    {formatDueDate(d.predictedNextDue)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                  {formatMYR(d.amount)}
                </p>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleConfirm(d)}
                    disabled={busy}
                    className="flex cursor-pointer items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/25 disabled:opacity-50"
                    title="Mark as recurring"
                  >
                    <Check className="h-3 w-3" />
                    {busy ? "Saving…" : "Confirm"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDismiss(d)}
                    aria-label="Dismiss"
                    className="cursor-pointer rounded-lg p-1 text-subtle-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        {visible.length > 4 && (
          <p className="mt-3 text-center text-[11px] text-subtle-foreground">
            +{visible.length - 4} more — confirm or dismiss the ones above to
            see the rest
          </p>
        )}
      </section>

      <Toast {...toast} />
    </>
  );
}
