"use client";

import { useCallback, useSyncExternalStore } from "react";

export type AccentPalette =
  | "emerald"
  | "ocean"
  | "violet"
  | "sunset"
  | "rose"
  | "slate";

export type Density = "compact" | "comfortable" | "spacious";

export interface Preferences {
  accent: AccentPalette;
  density: Density;
  privacy: boolean;
  reduceMotion: boolean;
  showCents: boolean;
}

const STORAGE_KEY = "flowtrace-prefs";
const EVENT_NAME = "flowtrace-prefs-change";

export const DEFAULT_PREFS: Preferences = {
  accent: "emerald",
  density: "comfortable",
  privacy: false,
  reduceMotion: false,
  showCents: true,
};

export const ACCENT_PALETTES: Record<
  AccentPalette,
  { label: string; swatch: string; description: string }
> = {
  emerald: {
    label: "Emerald",
    swatch: "#10b981",
    description: "Calm & balanced (default)",
  },
  ocean: { label: "Ocean", swatch: "#0ea5e9", description: "Cool & focused" },
  violet: {
    label: "Violet",
    swatch: "#8b5cf6",
    description: "Modern & expressive",
  },
  sunset: { label: "Sunset", swatch: "#f97316", description: "Warm & lively" },
  rose: { label: "Rose", swatch: "#f43f5e", description: "Bold & romantic" },
  slate: {
    label: "Graphite",
    swatch: "#64748b",
    description: "Monochrome & minimal",
  },
};

// Cached snapshot — useSyncExternalStore requires stable references.
// We only produce a new object when the underlying JSON string actually
// changes. Without this cache, every snapshot read allocates a fresh object,
// React sees "new" state forever, and the component re-renders in a loop.
let cachedRaw: string | null | undefined = undefined;
let cachedSnapshot: Preferences = DEFAULT_PREFS;

function readRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parseRaw(raw: string | null): Preferences {
  if (!raw) return DEFAULT_PREFS;
  try {
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

function readStored(): Preferences {
  const raw = readRaw();
  if (cachedRaw === raw) return cachedSnapshot;
  cachedRaw = raw;
  cachedSnapshot = parseRaw(raw);
  return cachedSnapshot;
}

function applyPreferences(prefs: Preferences) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-accent", prefs.accent);
  root.setAttribute("data-density", prefs.density);
  root.classList.toggle("privacy-mode", prefs.privacy);
  root.classList.toggle("reduce-motion", prefs.reduceMotion);
}

function invalidateCache() {
  cachedRaw = undefined;
}

function subscribe(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onChange = () => {
    invalidateCache();
    cb();
  };
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT_NAME, onChange);
  applyPreferences(readStored());
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT_NAME, onChange);
  };
}

function getSnapshot(): Preferences {
  return readStored();
}

function getServerSnapshot(): Preferences {
  return DEFAULT_PREFS;
}

export function usePreferences() {
  const prefs = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const update = useCallback((patch: Partial<Preferences>) => {
    const current = readStored();
    const next = { ...current, ...patch };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota errors */
    }
    invalidateCache();
    applyPreferences(next);
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  const togglePrivacy = useCallback(() => {
    const current = readStored();
    update({ privacy: !current.privacy });
  }, [update]);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    invalidateCache();
    applyPreferences(DEFAULT_PREFS);
    window.dispatchEvent(new Event(EVENT_NAME));
  }, []);

  return { prefs, update, togglePrivacy, reset };
}
