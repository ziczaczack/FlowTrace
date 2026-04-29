"use client";

import { useCallback, useRef, useState } from "react";

type ToastType = "success" | "error";

export type ToastAction = {
  label: string;
  onAction: () => void;
};

export type ToastState = {
  message: string;
  type: ToastType;
  visible: boolean;
  action?: ToastAction;
  onDismiss?: () => void;
};

type ShowToastOptions = {
  duration?: number;
  action?: ToastAction;
  onDismiss?: () => void;
};

/**
 * Tiny single-toast hook. Auto-dismisses after `duration` ms (default 3000).
 * Pass `action` for an inline button (e.g. Undo); `onDismiss` fires once when
 * the toast finishes its lifecycle without the action being taken.
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "success",
    visible: false,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissRef = useRef<(() => void) | null>(null);

  const clearPending = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (dismissRef.current) {
      const fn = dismissRef.current;
      dismissRef.current = null;
      fn();
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType, options: ShowToastOptions = {}) => {
      clearPending();
      const { duration = 3000, action, onDismiss } = options;
      dismissRef.current = onDismiss ?? null;

      const wrappedAction: ToastAction | undefined = action
        ? {
            label: action.label,
            onAction: () => {
              if (timer.current) clearTimeout(timer.current);
              timer.current = null;
              dismissRef.current = null;
              setToast((prev) => ({ ...prev, visible: false }));
              action.onAction();
            },
          }
        : undefined;

      setToast({ message, type, visible: true, action: wrappedAction });
      timer.current = setTimeout(() => {
        setToast((prev) => ({ ...prev, visible: false }));
        const fn = dismissRef.current;
        dismissRef.current = null;
        if (fn) fn();
      }, duration);
    },
    [clearPending],
  );

  return { toast, showToast };
}
