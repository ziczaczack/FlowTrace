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
          className="text-sm font-medium text-white/80"
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
          "w-full rounded-md px-3 py-2.5 text-sm text-white placeholder:text-white/40",
          "bg-[#1E2D45] border transition-colors",
          hasError
            ? "border-[#F43F5E] focus:border-[#F43F5E] focus:ring-2 focus:ring-[#F43F5E]/40"
            : "border-[#2E4060] focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/40",
          "outline-none disabled:cursor-not-allowed disabled:opacity-60",
          className ?? "",
        ].join(" ")}
        {...rest}
      />
      {hasError && (
        <p
          id={`${inputId}-error`}
          className="text-xs text-[#F43F5E]"
        >
          {error}
        </p>
      )}
    </div>
  );
});
