"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  label?: string;
  error?: string | null;
  value: string;
  onChange: (value: string) => void;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, value, onChange, id, type = "text", disabled, className, ...rest },
  ref,
) {
  const inputId = id ?? rest.name ?? label?.toLowerCase().replace(/\s+/g, "-");
  const hasError = Boolean(error);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        type={type}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${inputId}-error` : undefined}
        className={[
          "w-full rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-subtle-foreground",
          "bg-surface-muted border transition-colors duration-200",
          hasError
            ? "border-negative focus:border-negative focus:ring-2 focus:ring-[var(--negative-soft)]"
            : "border-border hover:border-border-strong focus:border-primary focus:ring-2 focus:ring-[var(--ring)]",
          "outline-none disabled:cursor-not-allowed disabled:opacity-60",
          className ?? "",
        ].join(" ")}
        {...rest}
      />
      {hasError && (
        <p id={`${inputId}-error`} className="text-xs text-negative">
          {error}
        </p>
      )}
    </div>
  );
});
