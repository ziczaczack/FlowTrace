"use client";

type FabProps = {
  onClick: () => void;
  hidden?: boolean;
  ariaLabel?: string;
};

export function Fab({ onClick, hidden, ariaLabel = "Add transaction" }: FabProps) {
  if (hidden) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#10B981] text-white shadow-lg shadow-emerald-900/40 transition-transform hover:scale-105 hover:bg-[#059669] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
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
