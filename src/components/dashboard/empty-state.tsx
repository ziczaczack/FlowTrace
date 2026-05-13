"use client";

import { useT } from "@/lib/i18n";

export function EmptyState() {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-16 text-center">
      <EmptyIllustration />
      <h2 className="mt-5 text-lg font-semibold text-foreground">
        {t("dashboard.emptyTitle")}
      </h2>
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {t("dashboard.emptyHint")}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] text-subtle-foreground">
        <Chip>
          {renderWithKbd(t("dashboard.emptyChip1", { kbd: "/" }), "/")}
        </Chip>
        <Chip>
          {renderWithKbd(t("dashboard.emptyChip2", { kbd: "N" }), "N")}
        </Chip>
        <Chip>
          {renderWithKbd(t("dashboard.emptyChip3", { kbd: "?" }), "?")}
        </Chip>
      </div>
    </div>
  );
}

function renderWithKbd(text: string, key: string): React.ReactNode {
  // Replace the first occurrence of `key` with a <Kbd> element so the
  // translated string can place the keystroke wherever its grammar wants.
  const idx = text.indexOf(key);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <Kbd>{key}</Kbd>
      {text.slice(idx + key.length)}
    </>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1">
      {children}
    </span>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[18px] items-center justify-center rounded border border-border bg-surface-muted px-1 text-[10px] font-semibold text-foreground">
      {children}
    </kbd>
  );
}

function EmptyIllustration() {
  return (
    <svg
      viewBox="0 0 200 140"
      className="h-28 w-40 text-primary/70"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle
        cx="100"
        cy="72"
        r="56"
        className="fill-[color-mix(in_oklab,var(--primary)_10%,transparent)]"
        stroke="none"
      />
      <path d="M64 36 L64 104 L68 100 L74 104 L80 100 L86 104 L92 100 L96 104 L96 36 Z" />
      <line x1="72" y1="52" x2="90" y2="52" />
      <line x1="72" y1="62" x2="88" y2="62" />
      <line x1="72" y1="72" x2="92" y2="72" />
      <line x1="72" y1="82" x2="84" y2="82" />
      <rect x="106" y="46" width="54" height="42" rx="5" />
      <path d="M114 78 L124 70 L132 74 L146 58" />
      <path d="M140 58 L146 58 L146 64" />
      <circle cx="134" cy="102" r="10" />
      <path d="M134 96 L134 108" />
      <path d="M131 99 L137 99" />
      <path d="M131 105 L137 105" />
      <path d="M48 48 L48 56" />
      <path d="M44 52 L52 52" />
      <path d="M156 34 L156 40" />
      <path d="M153 37 L159 37" />
    </svg>
  );
}
