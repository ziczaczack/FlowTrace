"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Target, Pencil, Trash2 } from "lucide-react";
import type { SavingsGoal } from "@/types/database";
import { Toast } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

type Props = { goals: SavingsGoal[] };

const formatMYR = (n: number) =>
  n.toLocaleString("en-MY", { style: "currency", currency: "MYR" });

const ICON_OPTIONS = [
  "🎯",
  "✈️",
  "🏠",
  "🚗",
  "💍",
  "🎓",
  "📱",
  "🛡️",
  "🌴",
  "🪴",
];

const COLOR_OPTIONS = [
  "#10b981",
  "#06b6d4",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#f97316",
  "#eab308",
  "#0ea5e9",
];

function progressPct(current: number, target: number): number {
  if (target <= 0) return 0;
  return Math.min(100, Math.max(0, (current / target) * 100));
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

function GoalRing({
  pct,
  color,
  size = 88,
}: {
  pct: number;
  color: string;
  size?: number;
}) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
      aria-hidden
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--surface-muted)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 400ms ease-out" }}
      />
    </svg>
  );
}

type EditState =
  | { mode: "create" }
  | { mode: "edit"; goal: SavingsGoal }
  | null;

export function SavingsGoals({ goals }: Props) {
  const router = useRouter();
  const { toast, showToast } = useToast();
  const [editing, setEditing] = useState<EditState>(null);

  // Empty state: still render the section so users can add their first goal.
  return (
    <>
      <section className="glass-card rounded-2xl p-5 sm:p-6">
        <header className="mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" aria-hidden />
          <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-subtle-foreground">
            Savings goals
          </h2>
          <button
            type="button"
            onClick={() => setEditing({ mode: "create" })}
            className="ml-auto flex cursor-pointer items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/25"
          >
            <Plus className="h-3 w-3" />
            New goal
          </button>
        </header>

        {goals.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No goals yet — set one and watch the ring fill up.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} onEdit={() => setEditing({ mode: "edit", goal: g })} />
            ))}
          </div>
        )}
      </section>

      {editing && (
        <SavingsGoalModal
          state={editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            showToast(message, "success");
            setEditing(null);
            router.refresh();
          }}
          onError={(m) => showToast(m, "error")}
        />
      )}

      <Toast {...toast} />
    </>
  );
}

function GoalCard({
  goal,
  onEdit,
}: {
  goal: SavingsGoal;
  onEdit: () => void;
}) {
  const target = parseFloat(goal.target_amount);
  const current = parseFloat(goal.current_amount);
  const pct = progressPct(current, target);
  const color = goal.color ?? "#10b981";
  const days = daysUntil(goal.target_date);
  const dayLabel =
    days === null
      ? null
      : days < 0
        ? "Past target"
        : days === 0
          ? "Due today"
          : days < 31
            ? `${days} days left`
            : `${Math.round(days / 30)} mo left`;

  return (
    <button
      type="button"
      onClick={onEdit}
      className="group relative flex w-full cursor-pointer items-center gap-4 rounded-xl border border-border bg-surface/60 p-3 text-left transition-colors hover:bg-surface"
    >
      <div className="relative h-[88px] w-[88px] shrink-0">
        <GoalRing pct={pct} color={color} />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl" aria-hidden>
            {goal.icon ?? "🎯"}
          </span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {goal.name}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
          {formatMYR(current)}{" "}
          <span className="text-subtle-foreground">
            / {formatMYR(target)}
          </span>
        </p>
        <div className="mt-1 flex items-center gap-2 text-[10px]">
          <span
            className="font-semibold tabular-nums"
            style={{ color }}
          >
            {Math.round(pct)}%
          </span>
          {dayLabel && (
            <span className="text-subtle-foreground">· {dayLabel}</span>
          )}
        </div>
      </div>
      <Pencil
        className="h-3.5 w-3.5 text-subtle-foreground opacity-0 transition-opacity group-hover:opacity-100"
        aria-hidden
      />
    </button>
  );
}

function SavingsGoalModal({
  state,
  onClose,
  onSaved,
  onError,
}: {
  state: { mode: "create" } | { mode: "edit"; goal: SavingsGoal };
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}) {
  const isEdit = state.mode === "edit";
  const goal = isEdit ? state.goal : null;

  const [name, setName] = useState(goal?.name ?? "");
  const [icon, setIcon] = useState(goal?.icon ?? "🎯");
  const [color, setColor] = useState(goal?.color ?? "#10b981");
  const [targetAmount, setTargetAmount] = useState(
    goal ? String(parseFloat(goal.target_amount)) : "",
  );
  const [currentAmount, setCurrentAmount] = useState(
    goal ? String(parseFloat(goal.current_amount)) : "0",
  );
  const [targetDate, setTargetDate] = useState(goal?.target_date ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleSave() {
    const target = Number(targetAmount);
    if (!name.trim() || !Number.isFinite(target) || target <= 0) {
      onError("Enter a name and a positive target amount");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        icon,
        color,
        targetAmount: target,
        currentAmount: Number(currentAmount) || 0,
        targetDate: targetDate || null,
      };
      const res = await fetch(
        isEdit ? `/api/savings-goals/${goal!.id}` : "/api/savings-goals",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Failed to save goal");
      }
      onSaved(isEdit ? "Goal updated" : "Goal created");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to save goal");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!isEdit || !goal) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/savings-goals/${goal.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Failed to delete goal");
      }
      onSaved("Goal deleted");
    } catch (e) {
      onError(e instanceof Error ? e.message : "Failed to delete goal");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50">
      <div onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Edit savings goal" : "Create savings goal"}
        className="glass-card-strong absolute left-0 right-0 bottom-0 mx-auto w-full max-w-lg rounded-t-3xl p-6 md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl"
      >
        <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-border-strong md:hidden" />
        <h3 className="mb-4 text-lg font-semibold text-foreground">
          {isEdit ? "Edit goal" : "New savings goal"}
        </h3>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Japan trip"
              className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
                Target (RM)
              </label>
              <input
                inputMode="decimal"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="3000"
                className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
                Saved so far (RM)
              </label>
              <input
                inputMode="decimal"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
              Target date (optional)
            </label>
            <input
              type="date"
              value={targetDate ?? ""}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface-muted px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
              Icon
            </p>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setIcon(opt)}
                  className={[
                    "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border text-base transition-colors",
                    opt === icon
                      ? "border-primary bg-primary/15"
                      : "border-border bg-surface-muted hover:bg-surface-strong",
                  ].join(" ")}
                  aria-label={`Icon ${opt}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-subtle-foreground">
              Colour
            </p>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setColor(opt)}
                  className={[
                    "h-7 w-7 cursor-pointer rounded-full border-2 transition-transform",
                    opt === color ? "scale-110 border-foreground" : "border-transparent",
                  ].join(" ")}
                  style={{ backgroundColor: opt }}
                  aria-label={`Colour ${opt}`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="w-full cursor-pointer rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create goal"}
          </button>
          {isEdit && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-negative px-4 py-2.5 text-sm font-semibold text-negative transition-colors hover:bg-[var(--negative-soft)] disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? "Deleting…" : "Delete goal"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full cursor-pointer rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
