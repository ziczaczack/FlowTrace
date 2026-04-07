"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
        aria-label="Account menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10B981] text-sm font-semibold text-white hover:bg-[#059669] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-40 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#162032] shadow-xl">
          <div className="px-4 py-3 text-xs">
            <p className="text-white/40">Signed in as</p>
            <p className="mt-0.5 truncate text-white/80">{email}</p>
          </div>
          <div className="h-px bg-white/10" />
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            className="block w-full px-4 py-3 text-left text-sm text-white hover:bg-white/5 disabled:opacity-60"
          >
            {signingOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
