"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X, TrendingUp } from "lucide-react";
import type { CategoryBudgetItem } from "@/types/database";

type Props = {
  initialItems: CategoryBudgetItem[];
};

const formatMYR = (n: number) =>
  n.toLocaleString("en-MY", { style: "currency", currency: "MYR" });

function ProgressBar({
  percentage,
  color,
}: {
  percentage: number;
  color: string | null;
}) {
  const capped = Math.min(percentage, 100);
  const barColor =
    percentage > 100
      ? "var(--negative)"
      : percentage > 80
        ? "var(--warning)"
        : color ?? "var(--primary)";

  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${capped}%`, background: barColor }}
      />
    </div>
  );
}

export function BudgetManager({ initialItems }: Props) {
  const [items, setItems] = useState<CategoryBudgetItem[]>(initialItems);
  const [editing, setEditing] = useState<string | null>(null); // categoryId being edited
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveEdit(categoryId: string) {
    const limit = parseFloat(draft);
    if (!Number.isFinite(limit) || limit <= 0) {
      setError("Enter a valid amount greater than 0");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, amountLimit: limit }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to save");
      // Update local state
      setItems((prev) =>
        prev.map((item) =>
          item.categoryId === categoryId
            ? {
                ...item,
                budgetId: json.data.id,
                budgetLimit: limit,
                percentage:
                  limit > 0
                    ? Math.min((item.currentSpend / limit) * 100, 999)
                    : 0,
              }
            : item,
        ),
      );
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function removeBudget(categoryId: string, budgetId: string) {
    try {
      const res = await fetch(`/api/budgets/${budgetId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Failed to remove");
      setItems((prev) =>
        prev.map((item) =>
          item.categoryId === categoryId
            ? { ...item, budgetId: null, budgetLimit: null, percentage: 0 }
            : item,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove budget");
    }
  }

  function startEdit(item: CategoryBudgetItem) {
    setEditing(item.categoryId);
    setDraft(item.budgetLimit ? String(item.budgetLimit) : "");
    setError(null);
  }

  const withBudget = items.filter((i) => i.budgetLimit !== null);
  const withSpendOnly = items.filter(
    (i) => i.budgetLimit === null && i.currentSpend > 0,
  );

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <TrendingUp className="mb-3 h-8 w-8 text-subtle-foreground" />
        <p className="text-sm font-medium text-foreground">No spending this month</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Budgets will appear here once you record expenses
        </p>
      </div>
    );
  }

  const renderItem = (item: CategoryBudgetItem) => {
    const isEditing = editing === item.categoryId;
    return (
      <div key={item.categoryId} className="py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base" aria-hidden>
              {item.categoryIcon ?? "📦"}
            </span>
            <span className="truncate text-sm font-medium text-foreground">
              {item.categoryName}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {isEditing ? (
              <>
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    setError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(item.categoryId);
                    if (e.key === "Escape") setEditing(null);
                  }}
                  placeholder="0.00"
                  className="w-28 rounded-lg border border-border bg-surface-muted px-2.5 py-1 text-right text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-[var(--ring)]"
                  inputMode="decimal"
                />
                <button
                  type="button"
                  onClick={() => saveEdit(item.categoryId)}
                  disabled={saving}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
                  aria-label="Save budget"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-surface-muted cursor-pointer"
                  aria-label="Cancel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <div className="text-right">
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {formatMYR(item.currentSpend)}
                    {item.budgetLimit !== null && (
                      <span className="text-subtle-foreground">
                        {" / "}
                        {formatMYR(item.budgetLimit)}
                      </span>
                    )}
                  </p>
                  {item.budgetLimit !== null && (
                    <p
                      className={`text-[11px] font-medium tabular-nums ${
                        item.percentage > 100
                          ? "text-negative"
                          : item.percentage > 80
                            ? "text-warning"
                            : "text-muted-foreground"
                      }`}
                    >
                      {Math.round(item.percentage)}%
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-subtle-foreground transition-colors hover:bg-surface-muted hover:text-foreground cursor-pointer"
                  aria-label={`Edit budget for ${item.categoryName}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {item.budgetId && (
                  <button
                    type="button"
                    onClick={() => removeBudget(item.categoryId, item.budgetId!)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-subtle-foreground transition-colors hover:bg-[var(--negative-soft)] hover:text-negative cursor-pointer"
                    aria-label={`Remove budget for ${item.categoryName}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {item.budgetLimit !== null && !isEditing && (
          <div className="mt-2 px-0.5">
            <ProgressBar
              percentage={item.percentage}
              color={item.categoryColor}
            />
          </div>
        )}

        {isEditing && error && (
          <p className="mt-1 text-xs text-negative">{error}</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {error && !editing && (
        <p className="mb-2 text-xs text-negative">{error}</p>
      )}

      {withBudget.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-subtle-foreground">
            Budgets set
          </p>
          <div className="divide-y divide-border">
            {withBudget.map(renderItem)}
          </div>
        </div>
      )}

      {withSpendOnly.length > 0 && (
        <div className={withBudget.length > 0 ? "mt-4" : ""}>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-subtle-foreground">
            No budget set · click{" "}
            <Pencil className="inline h-3 w-3" aria-hidden /> to add one
          </p>
          <div className="divide-y divide-border">
            {withSpendOnly.map(renderItem)}
          </div>
        </div>
      )}
    </div>
  );
}
