"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";

const STORAGE_KEY = "flowtrace-onboarding-seen";

type Step = {
  title: string;
  body: React.ReactNode;
  illustration: React.ReactNode;
};

type Props = {
  /** When true, suppress the tour even if the user has never dismissed it
   *  (e.g. they already have transactions — they don't need an intro). */
  suppress?: boolean;
};

const STROKE_PROPS = {
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function WelcomeArt() {
  return (
    <svg viewBox="0 0 200 140" className="h-32 w-44 text-primary" {...STROKE_PROPS} aria-hidden>
      <circle
        cx="100"
        cy="72"
        r="58"
        className="fill-[color-mix(in_oklab,var(--primary)_12%,transparent)]"
        stroke="none"
      />
      {/* card with chart */}
      <rect x="58" y="42" width="84" height="56" rx="7" />
      <path d="M68 86 L82 70 L94 78 L116 56" />
      <path d="M108 56 L116 56 L116 64" />
      {/* coin trio */}
      <circle cx="74" cy="116" r="7" />
      <circle cx="100" cy="116" r="7" />
      <circle cx="126" cy="116" r="7" />
      {/* sparkles */}
      <path d="M44 50 L44 58" />
      <path d="M40 54 L48 54" />
      <path d="M158 38 L158 44" />
      <path d="M155 41 L161 41" />
    </svg>
  );
}

function QuickAddArt() {
  return (
    <svg viewBox="0 0 200 140" className="h-32 w-44 text-primary" {...STROKE_PROPS} aria-hidden>
      <circle
        cx="100"
        cy="72"
        r="58"
        className="fill-[color-mix(in_oklab,var(--primary)_12%,transparent)]"
        stroke="none"
      />
      {/* search bar */}
      <rect x="42" y="48" width="116" height="22" rx="11" />
      <path d="M52 59 L60 59" />
      <text x="64" y="63" fontSize="9" fill="currentColor" stroke="none" fontFamily="monospace">
        25 coffee
      </text>
      {/* cursor */}
      <path d="M118 53 L118 65" strokeWidth="1.4" />
      {/* arrow down to result */}
      <path d="M100 78 L100 92" strokeDasharray="2 3" />
      <path d="M96 88 L100 92 L104 88" />
      {/* result row */}
      <rect x="42" y="96" width="116" height="20" rx="6" />
      <circle cx="54" cy="106" r="5" className="fill-[color-mix(in_oklab,var(--primary)_25%,transparent)]" stroke="none" />
      <text x="64" y="110" fontSize="8" fill="currentColor" stroke="none">
        Coffee · today
      </text>
      <text x="132" y="110" fontSize="8" fill="currentColor" stroke="none" fontWeight="bold">
        −RM25
      </text>
    </svg>
  );
}

function PaletteArt() {
  return (
    <svg viewBox="0 0 200 140" className="h-32 w-44 text-primary" {...STROKE_PROPS} aria-hidden>
      <circle
        cx="100"
        cy="72"
        r="58"
        className="fill-[color-mix(in_oklab,var(--primary)_12%,transparent)]"
        stroke="none"
      />
      {/* keyboard frame */}
      <rect x="40" y="92" width="120" height="32" rx="5" />
      {/* keys */}
      <rect x="46" y="98" width="14" height="10" rx="1" />
      <rect x="62" y="98" width="14" height="10" rx="1" />
      <rect
        x="78"
        y="98"
        width="20"
        height="10"
        rx="1"
        className="fill-[color-mix(in_oklab,var(--primary)_30%,transparent)]"
      />
      <text x="83" y="106" fontSize="7" fill="currentColor" stroke="none" fontWeight="bold">⌘K</text>
      <rect x="100" y="98" width="14" height="10" rx="1" />
      <rect x="116" y="98" width="14" height="10" rx="1" />
      <rect x="132" y="98" width="14" height="10" rx="1" />
      {/* palette window above */}
      <rect x="54" y="32" width="92" height="50" rx="6" />
      <line x1="62" y1="44" x2="138" y2="44" />
      <rect x="62" y="52" width="76" height="8" rx="2" className="fill-[color-mix(in_oklab,var(--primary)_25%,transparent)]" stroke="none" />
      <line x1="62" y1="68" x2="120" y2="68" />
      <line x1="62" y1="74" x2="110" y2="74" />
      {/* link line */}
      <path d="M100 82 L88 92" strokeDasharray="2 3" />
    </svg>
  );
}

const STEPS: Step[] = [
  {
    title: "Welcome to FlowTrace",
    body: (
      <>
        A calm finance tracker built for individual investors. Two inputs to log
        an expense — that&rsquo;s the goal.
      </>
    ),
    illustration: <WelcomeArt />,
  },
  {
    title: "Type, don't tap",
    body: (
      <>
        Press <Kbd>/</Kbd> from anywhere to focus the quick-add bar, then type
        in plain English: <em>25 coffee yesterday</em>. We figure out the rest.
      </>
    ),
    illustration: <QuickAddArt />,
  },
  {
    title: "Everything via ⌘K",
    body: (
      <>
        Open the command palette with <Kbd>⌘</Kbd>+<Kbd>K</Kbd> (or{" "}
        <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd>) — jump to any page, change theme, export
        CSV, or add a transaction. Press <Kbd>?</Kbd> any time to see the full
        shortcut list.
      </>
    ),
    illustration: <PaletteArt />,
  },
];

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[18px] items-center justify-center rounded border border-border bg-surface-muted px-1.5 text-[10px] font-semibold text-foreground">
      {children}
    </kbd>
  );
}

export function OnboardingTour({ suppress = false }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Decide whether to surface the tour. localStorage is the source of truth
  // for "user has dismissed this", so we only mount the dialog once we've
  // checked it on the client.
  useEffect(() => {
    if (suppress) return;
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setOpen(true);
    } catch {
      // ignore: private mode etc. — tour just won't surface, which is fine.
    }
  }, [suppress]);

  // ESC closes (counts as dismiss).
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  if (!open) return null;
  const last = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome tour"
    >
      <div onClick={finish} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="glass-card-strong relative w-full max-w-md rounded-3xl p-6 sm:p-8">
        <button
          type="button"
          onClick={finish}
          aria-label="Skip tour"
          className="absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-subtle-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-6 flex justify-center">{current.illustration}</div>

        <div className="text-center">
          <p className="mb-1 inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-medium text-primary">
            <Sparkles className="h-3 w-3" aria-hidden />
            Step {step + 1} of {STEPS.length}
          </p>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            {current.title}
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {current.body}
          </p>
        </div>

        {/* Step dots */}
        <div className="mt-6 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              aria-hidden
              className={[
                "h-1.5 rounded-full transition-all",
                i === step ? "w-6 bg-primary" : "w-1.5 bg-border-strong",
              ].join(" ")}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finish}
            className="cursor-pointer text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous step"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            {last ? (
              <button
                type="button"
                onClick={finish}
                className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
              >
                Got it
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="flex cursor-pointer items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
