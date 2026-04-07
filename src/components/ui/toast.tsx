"use client";

type ToastType = "success" | "error";

type Props = {
  message: string;
  type: ToastType;
  visible: boolean;
};

export function Toast({ message, type, visible }: Props) {
  const bg = type === "success" ? "bg-[#10B981]" : "bg-[#F43F5E]";
  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        "pointer-events-none fixed left-1/2 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg shadow-black/40 transition-all duration-200",
        "bottom-[90px] md:bottom-6",
        bg,
        visible ? "opacity-100 translate-y-0" : "translate-y-2 opacity-0",
      ].join(" ")}
    >
      {message}
    </div>
  );
}
