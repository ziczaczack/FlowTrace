"use client";

import { useState } from "react";
import { Plus, Trash2, X, Check } from "lucide-react";
import type { Category } from "@/types/database";

type Props = {
  initialCategories: Category[];
};

const PRESET_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

const PRESET_ICONS = [
  "🛒", "🍽️", "🚗", "🏠", "💊", "🎬", "✈️", "👗",
  "📚", "💡", "🎮", "🐾", "💪", "🎁", "☕", "🔧",
  "💰", "📈", "💼", "🏦",
];

export function CategoriesManager({ initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(
    initialCategories.filter((c) => c.user_id !== null), // only custom
  );
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📦");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [newType, setNewType] = useState<"expense" | "income">("expense");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addCategory() {
    if (!newName.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          icon: newIcon,
          color: newColor,
          type: newType,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) throw new Error(json.error ?? "Failed to create");
      setCategories((prev) => [...prev, json.data as Category]);
      setAdding(false);
      setNewName("");
      setNewIcon("📦");
      setNewColor(PRESET_COLORS[0]);
      setNewType("expense");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create category");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(id: string) {
    try {
      const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed to delete");
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete category");
    }
  }

  return (
    <div>
      {error && (
        <p className="mb-3 text-xs text-negative">{error}</p>
      )}

      {categories.length === 0 && !adding && (
        <p className="mb-3 text-xs text-muted-foreground">
          No custom categories yet. System categories are always available.
        </p>
      )}

      {categories.length > 0 && (
        <div className="mb-4 divide-y divide-border">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
                  style={{ background: `${cat.color}22` }}
                >
                  {cat.icon ?? "📦"}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {cat.name}
                  </p>
                  <p className="text-[11px] capitalize text-muted-foreground">
                    {cat.type}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => deleteCategory(cat.id)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-subtle-foreground transition-colors hover:bg-[var(--negative-soft)] hover:text-negative cursor-pointer"
                aria-label={`Delete ${cat.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {adding ? (
        <div className="rounded-xl border border-border bg-surface-muted/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-foreground">
              New category
            </p>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              className="text-subtle-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Type toggle */}
          <div className="mb-3 flex rounded-lg border border-border overflow-hidden">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setNewType(t)}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors capitalize cursor-pointer ${
                  newType === t
                    ? "bg-primary text-primary-fg"
                    : "text-muted-foreground hover:bg-surface-muted"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Name */}
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
            placeholder="Category name"
            className="mb-3 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-[var(--ring)] placeholder:text-subtle-foreground"
          />

          {/* Icon picker */}
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-subtle-foreground">
            Icon
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {PRESET_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setNewIcon(icon)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition-colors cursor-pointer ${
                  newIcon === icon
                    ? "bg-primary/20 ring-1 ring-primary"
                    : "hover:bg-surface-muted"
                }`}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Color picker */}
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-subtle-foreground">
            Color
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setNewColor(color)}
                className={`h-6 w-6 rounded-full transition-transform cursor-pointer ${
                  newColor === color ? "scale-125 ring-2 ring-offset-1 ring-offset-surface ring-border" : ""
                }`}
                style={{ background: color }}
                aria-label={color}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addCategory}
            disabled={saving || !newName.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
          >
            <Check className="h-4 w-4" />
            {saving ? "Creating…" : "Create category"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Add custom category
        </button>
      )}
    </div>
  );
}
