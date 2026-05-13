"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";

type Props = {
  email: string;
  fullName: string | null;
};

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase() || email[0]?.toUpperCase() || "?";
  }
  return email[0]?.toUpperCase() ?? "?";
}

export function UserMenu({ email, fullName }: Props) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = getInitials(fullName, email);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("auth.accountMenu")}
        aria-expanded={open}
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-fg shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        {initials}
      </button>

      {open && (
        <div className="glass-card-strong absolute right-0 top-12 z-40 w-60 overflow-hidden rounded-2xl">
          <div className="px-4 py-3">
            <p className="text-[11px] uppercase tracking-wide text-subtle-foreground">
              {t("auth.signedInAs")}
            </p>
            <p className="mt-0.5 truncate text-sm text-foreground">{email}</p>
          </div>
          <div className="h-px bg-border" />
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full cursor-pointer items-center gap-2 px-4 py-3 text-left text-sm text-foreground transition-colors hover:bg-surface-muted disabled:opacity-60"
          >
            <LogOut className="h-4 w-4 text-muted-foreground" />
            {signingOut ? t("auth.signingOut") : t("auth.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
