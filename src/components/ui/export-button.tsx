"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

type Props = {
  month?: number;
  year?: number;
  ledgerId?: string;
  label?: string;
};

export function ExportButton({
  month,
  year,
  ledgerId,
  label = "Export CSV",
}: Props) {
  const [loading, setLoading] = useState(false);

  function handleClick() {
    const params = new URLSearchParams();
    if (month) params.set("month", String(month));
    if (year) params.set("year", String(year));
    if (ledgerId) params.set("ledgerId", ledgerId);
    const url = `/api/export${params.toString() ? `?${params.toString()}` : ""}`;
    setLoading(true);
    window.location.href = url;
    // Browser kicks off the download; release the spinner shortly after.
    setTimeout(() => setLoading(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border bg-surface-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:bg-surface-strong hover:text-foreground disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {label}
    </button>
  );
}
