"use client";

import { useT } from "@/lib/i18n";

type FabProps = {
  onClick: () => void;
  hidden?: boolean;
  ariaLabel?: string;
};

export function Fab({ onClick, hidden, ariaLabel }: FabProps) {
  const t = useT();
  if (hidden) return null;
  const label = ariaLabel ?? t("fab.addTransaction");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={`${label} · N`}
      className="fixed bottom-24 right-5 z-50 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-fg shadow-[0_18px_40px_-12px_rgba(16,185,129,0.55)] transition-colors duration-200 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] md:bottom-8 md:right-8"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  );
}
