"use client";

type ToastType = "success" | "error";

type Props = {
  message: string;
  type: ToastType;
  visible: boolean;
};

export function Toast({ message, type, visible }: Props) {
  const bg = type === "success" ? "bg-positive" : "bg-negative";
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "pointer-events-none fixed left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-[var(--shadow-elevated)] transition-all duration-200",
        "bottom-[110px] md:bottom-8",
        bg,
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
      ].join(" ")}
    >
      {message}
    </div>
  );
}
