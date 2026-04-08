"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "flowtrace-theme";
const EVENT_NAME = "flowtrace-theme-change";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

function readStored(): Theme {
  if (typeof window === "undefined") return "dark";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return "dark";
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT_NAME, cb);
  // Apply the persisted theme to <html> the first time anyone subscribes,
  // so the class lands before the first paint (no flash).
  applyTheme(readStored());
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT_NAME, cb);
  };
}

function getSnapshot(): Theme {
  return readStored();
}

function getServerSnapshot(): Theme {
  return "dark";
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const current = readStored();
    const next: Theme = current === "dark" ? "light" : "dark";
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore storage errors (private mode etc.)
    }
    applyTheme(next);
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  return { theme, toggle };
}
