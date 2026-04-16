"use client";

import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  initialName: string;
  email: string;
};

export function ProfileEditor({ initialName, email }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(initialName);
  const [draft, setDraft] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!draft.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: draft.trim() },
      });
      if (updateError) throw new Error(updateError.message);
      setName(draft.trim());
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(name);
    setEditing(false);
    setError(null);
  }

  return (
    <div className="space-y-4 text-sm">
      <div>
        <p className="text-[11px] uppercase tracking-wide text-subtle-foreground">
          Display name
        </p>
        {editing ? (
          <div className="mt-1.5 flex items-center gap-2">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") save();
                if (e.key === "Escape") cancel();
              }}
              className="flex-1 rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-[var(--ring)]"
              placeholder="Your name"
            />
            <button
              type="button"
              onClick={save}
              disabled={saving || !draft.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
              aria-label="Save name"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={cancel}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-surface-muted cursor-pointer"
              aria-label="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">
              {name || "—"}
            </p>
            <button
              type="button"
              onClick={() => {
                setDraft(name);
                setEditing(true);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-subtle-foreground transition-colors hover:bg-surface-muted hover:text-foreground cursor-pointer"
              aria-label="Edit name"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {error && <p className="mt-1 text-xs text-negative">{error}</p>}
      </div>

      <div>
        <p className="text-[11px] uppercase tracking-wide text-subtle-foreground">
          Email
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">{email}</p>
      </div>
    </div>
  );
}
