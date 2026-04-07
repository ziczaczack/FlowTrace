"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "ghost";

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
};

export function Button({
  children,
  variant = "primary",
  loading = false,
  disabled,
  type = "button",
  className,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const base =
    "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#162032] disabled:cursor-not-allowed disabled:opacity-60";

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-[#10B981] text-white hover:bg-[#059669] focus-visible:ring-[#10B981]",
    ghost:
      "bg-transparent text-white border border-white/30 hover:bg-white/10 focus-visible:ring-white/40",
  };

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={[base, variants[variant], className ?? ""].join(" ")}
      {...rest}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
