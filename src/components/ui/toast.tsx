"use client";

type ToastType = "success" | "error";

type ToastAction = {
  label: string;
  onAction: () => void;
};

type Props = {
  message: string;
  type: ToastType;
  visible: boolean;
  action?: ToastAction;
};

export function Toast({ message, type, visible, action }: Props) {
  const bg = type === "success" ? "bg-positive" : "bg-negative";
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "fixed left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full py-2 pl-4 text-sm font-medium text-white shadow-[var(--shadow-elevated)] transition-all duration-200",
        action ? "pr-1.5" : "pr-4",
        "bottom-[110px] md:bottom-8",
        bg,
        visible
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none translate-y-2 opacity-0",
      ].join(" ")}
    >
      <span>{message}</span>
      {action && (
        <button
          type="button"
          onClick={action.onAction}
          className="cursor-pointer rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-white/30"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
