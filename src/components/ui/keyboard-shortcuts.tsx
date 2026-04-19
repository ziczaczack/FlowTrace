"use client";

import { useEffect, useState } from "react";
import { Keyboard, X } from "lucide-react";
import { usePreferences } from "@/hooks/use-preferences";

type Shortcut = {
  keys: string[];
  label: string;
};

type Group = {
  heading: string;
  shortcuts: Shortcut[];
};

const GROUPS: Group[] = [
  {
    heading: "Global",
    shortcuts: [
      { keys: ["⌘", "K"], label: "Open command palette" },
      { keys: ["?"], label: "Show this shortcut guide" },
      { keys: ["P"], label: "Toggle privacy mode (blur amounts)" },
      { keys: ["G", "then", "D"], label: "Go to Dashboard" },
      { keys: ["G", "then", "T"], label: "Go to Timeline" },
      { keys: ["G", "then", "A"], label: "Go to Analytics" },
      { keys: ["G", "then", "C"], label: "Go to Calendar" },
      { keys: ["G", "then", "S"], label: "Go to Settings" },
    ],
  },
  {
    heading: "Quick add",
    shortcuts: [
      { keys: ["N"], label: "Open new transaction modal" },
      { keys: ["/"], label: "Focus the natural-language quick-add bar" },
      { keys: ["Enter"], label: "Save parsed quick-add entry" },
    ],
  },
  {
    heading: "Navigation inside pages",
    shortcuts: [
      { keys: ["J", "/", "K"], label: "Move down / up in lists" },
      { keys: ["←", "→"], label: "Previous / next month (Calendar, Timeline)" },
      { keys: ["Esc"], label: "Close any overlay" },
    ],
  },
];

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);
  const { togglePrivacy } = usePreferences();

  useEffect(() => {
    let pendingG = 0;

    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };

    const handler = (e: KeyboardEvent) => {
      // Skip when modifier keys are pressed (except for ? which needs shift)
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditable(e.target)) return;

      // ? (shift + /)
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }

      if (e.key === "Escape" && open) {
        setOpen(false);
        return;
      }

      // P → toggle privacy
      if (e.key.toLowerCase() === "p" && !e.shiftKey) {
        e.preventDefault();
        togglePrivacy();
        return;
      }

      // Go-to chords: press G then letter within 1.2s
      if (e.key.toLowerCase() === "g") {
        pendingG = Date.now();
        return;
      }
      if (pendingG && Date.now() - pendingG < 1200) {
        const routes: Record<string, string> = {
          d: "/",
          t: "/timeline",
          a: "/analytics",
          c: "/calendar",
          s: "/settings",
        };
        const target = routes[e.key.toLowerCase()];
        if (target) {
          e.preventDefault();
          window.location.href = target;
        }
        pendingG = 0;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, togglePrivacy]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
    >
      <div
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />
      <div className="glass-card-strong relative z-10 w-full max-w-2xl animate-fade-in overflow-hidden rounded-2xl">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
              <Keyboard className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Keyboard shortcuts
              </h2>
              <p className="text-[11px] text-subtle-foreground">
                Press <Kbd>?</Kbd> anywhere to open this panel.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid max-h-[70vh] grid-cols-1 gap-6 overflow-y-auto p-5 sm:grid-cols-2">
          {GROUPS.map((group) => (
            <section key={group.heading}>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle-foreground">
                {group.heading}
              </p>
              <ul className="space-y-1.5">
                {group.shortcuts.map((s) => (
                  <li
                    key={s.label}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-surface-muted/60"
                  >
                    <span className="flex-1 text-foreground/85">{s.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {s.keys.map((k, i) =>
                        k === "then" || k === "/" ? (
                          <span
                            key={i}
                            className="text-[10px] uppercase tracking-wider text-subtle-foreground"
                          >
                            {k}
                          </span>
                        ) : (
                          <Kbd key={i}>{k}</Kbd>
                        ),
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="flex items-center justify-between border-t border-border bg-surface-muted/50 px-5 py-3 text-[11px] text-subtle-foreground">
          <span>
            Tip: combine <Kbd>G</Kbd> + letter for fast page switches.
          </span>
          <span className="font-medium text-foreground/70">FlowTrace</span>
        </footer>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[22px] items-center justify-center rounded-md border border-border bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-foreground shadow-[0_1px_0_rgba(15,23,42,0.08)]">
      {children}
    </kbd>
  );
}
