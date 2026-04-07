"use client";

import { useCallback, useRef, useState } from "react";

type ToastType = "success" | "error";

export type ToastState = {
  message: string;
  type: ToastType;
  visible: boolean;
};

/**
 * Tiny single-toast hook. Auto-dismisses after 3 seconds. The component
 * consuming this hook reads `toast` and renders <Toast {...toast} />.
 */
export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    message: "",
    type: "success",
    visible: false,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: ToastType) => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, type, visible: true });
    timer.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
  }, []);

  return { toast, showToast };
}
