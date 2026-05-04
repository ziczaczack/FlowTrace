"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  Mic,
  MicOff,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import type { Category, LedgerWithMembership } from "@/types/database";
import { parseQuickAdd, type ParsedEntry } from "@/lib/nl-parser";
import { ACTIVE_LEDGER_KEY } from "@/lib/active-ledger";
import {
  useSpeechRecognition,
  type SpeechError,
} from "@/hooks/use-speech-recognition";

type Props = {
  ledgers: LedgerWithMembership[];
  categories: Category[];
};

const EXAMPLES = [
  "25 coffee",
  "lunch 15 yesterday",
  "+2500 salary",
  "100 groceries monday",
];

function formatMYR(n: number) {
  return n.toLocaleString("en-MY", { style: "currency", currency: "MYR" });
}

function friendlyDate(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff <= 7) return `${diff} days ago`;
  return target.toLocaleDateString("en-MY", {
    day: "numeric",
    month: "short",
  });
}

export function QuickAddBar({ ledgers, categories }: Props) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<
    { kind: "idle" } | { kind: "saving" } | { kind: "success" } | { kind: "error"; msg: string }
  >({ kind: "idle" });
  const [placeholder, setPlaceholder] = useState(EXAMPLES[0]);
  const inputRef = useRef<HTMLInputElement>(null);

  const writable = useMemo(
    () => ledgers.filter((l) => l.role === "owner" || l.role === "editor"),
    [ledgers],
  );
  // Initial state must be identical on server and client to avoid hydration
  // mismatch — pick the deterministic owned default. localStorage is only
  // read after mount in the effect below.
  const [activeLedgerId, setActiveLedgerId] = useState<string>(() => {
    if (writable.length === 0) return "";
    const ownedDefault = writable.find(
      (l) => l.role === "owner" && l.is_default,
    );
    return (ownedDefault ?? writable[0]).id;
  });

  // After hydration, replace the initial pick with the user's stored choice
  // (if any). This causes a single re-render but doesn't break SSR.
  useEffect(() => {
    if (writable.length === 0) return;
    const stored = window.localStorage.getItem(ACTIVE_LEDGER_KEY);
    if (
      stored &&
      stored !== activeLedgerId &&
      writable.some((l) => l.id === stored)
    ) {
      setActiveLedgerId(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgers]);

  const activeLedger =
    writable.find((l) => l.id === activeLedgerId) ?? writable[0] ?? null;
  function pickLedger(id: string) {
    setActiveLedgerId(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACTIVE_LEDGER_KEY, id);
    }
  }

  // Voice capture — feeds transcript into the same NL parser as typing.
  const speech = useSpeechRecognition({
    onResult: (transcript) => {
      setValue(transcript);
      // Refocus so Enter still works to submit after a hands-free entry.
      inputRef.current?.focus();
    },
  });

  // Rotate placeholder examples so users discover what they can type.
  useEffect(() => {
    let idx = 0;
    const int = window.setInterval(() => {
      idx = (idx + 1) % EXAMPLES.length;
      setPlaceholder(EXAMPLES[idx]);
    }, 3200);
    return () => window.clearInterval(int);
  }, []);

  // Focus input when `/` is pressed globally.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !e.metaKey &&
        !e.ctrlKey
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Mirror the live transcript into the input while listening so the parsed
  // preview updates in real time. The hook's onResult also runs on stop, so
  // this is purely the live-preview path.
  useEffect(() => {
    if (!speech.isListening) return;
    const live = `${speech.finalTranscript} ${speech.interimTranscript}`
      .trim()
      .replace(/\s+/g, " ");
    if (live) setValue(live);
  }, [speech.isListening, speech.finalTranscript, speech.interimTranscript]);

  function toggleVoice() {
    if (speech.isListening) {
      speech.stop();
      return;
    }
    setValue("");
    speech.start();
  }

  const parsed = useMemo<ParsedEntry | null>(
    () => parseQuickAdd(value, categories),
    [value, categories],
  );

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!parsed) return;
    if (!activeLedger) {
      setStatus({ kind: "error", msg: "No writable ledger available" });
      return;
    }
    setStatus({ kind: "saving" });
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ledgerId: activeLedger.id,
          amount: parsed.amount,
          type: parsed.type,
          categoryId: parsed.categoryId,
          note: parsed.note,
          paymentMethod: "cash",
          txnDate: parsed.txnDate,
        }),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error ?? "Failed");
      }
      setStatus({ kind: "success" });
      setValue("");
      router.refresh();
      setTimeout(() => setStatus({ kind: "idle" }), 1400);
    } catch (err) {
      setStatus({
        kind: "error",
        msg: err instanceof Error ? err.message : "Failed to save",
      });
      setTimeout(() => setStatus({ kind: "idle" }), 2800);
    }
  }

  const canSubmit = parsed !== null && status.kind !== "saving";

  return (
    <div className="glass-card rounded-2xl p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
            <Zap className="h-3.5 w-3.5" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Quick add
            </p>
            <p className="text-[11px] text-muted-foreground">
              Type naturally. We&apos;ll parse it for you.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {writable.length > 1 && activeLedger && (
            <LedgerPickerDropdown
              ledgers={writable}
              activeId={activeLedger.id}
              onPick={pickLedger}
            />
          )}
          <kbd className="hidden rounded border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-subtle-foreground sm:inline-block">
            /
          </kbd>
        </div>
      </div>

      <form onSubmit={submit}>
        <div className="relative">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              speech.isListening
                ? "Listening… speak naturally"
                : `e.g. ${placeholder}`
            }
            className={[
              "w-full rounded-xl border bg-surface px-4 py-3 text-sm text-foreground outline-none placeholder:text-subtle-foreground focus:ring-2 focus:ring-[var(--ring)]",
              speech.isSupported ? "pr-[5.75rem]" : "pr-32",
              speech.isListening
                ? "border-primary ring-2 ring-[var(--ring)]"
                : "border-border focus:border-primary",
            ].join(" ")}
            autoComplete="off"
            spellCheck={false}
            disabled={speech.isListening}
          />
          <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {speech.isSupported && (
              <button
                type="button"
                onClick={toggleVoice}
                aria-pressed={speech.isListening}
                aria-label={
                  speech.isListening ? "Stop voice input" : "Start voice input"
                }
                title={
                  speech.isListening
                    ? "Stop listening"
                    : "Speak instead of typing"
                }
                className={[
                  "relative grid h-8 w-8 cursor-pointer place-items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                  speech.isListening
                    ? "bg-negative text-white"
                    : "bg-surface-muted text-muted-foreground hover:bg-surface-strong hover:text-foreground",
                ].join(" ")}
              >
                {speech.isListening && (
                  <span
                    aria-hidden
                    className="absolute inset-0 animate-ping rounded-lg bg-negative/40"
                  />
                )}
                {speech.isListening ? (
                  <MicOff className="relative h-4 w-4" aria-hidden />
                ) : (
                  <Mic className="relative h-4 w-4" aria-hidden />
                )}
              </button>
            )}
            <button
              type="submit"
              disabled={!canSubmit}
              className={[
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                canSubmit
                  ? "bg-primary text-primary-fg shadow-sm hover:bg-primary-hover"
                  : "cursor-not-allowed bg-surface-muted text-subtle-foreground",
              ].join(" ")}
            >
              {status.kind === "saving"
                ? "Saving…"
                : status.kind === "success"
                  ? "Saved ✓"
                  : "Add ↵"}
            </button>
          </div>
        </div>
      </form>

      {/* Preview chip */}
      <div className="mt-3 min-h-[36px]">
        {parsed ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium"
              style={{
                background: parsed.categoryColor
                  ? `${parsed.categoryColor}22`
                  : "var(--surface-muted)",
                color: parsed.categoryColor ?? "var(--foreground)",
              }}
            >
              <span>{parsed.categoryIcon ?? "📦"}</span>
              {parsed.categoryName}
            </span>
            <span
              className={[
                "rounded-full px-2.5 py-1 font-semibold amount-sensitive tabular-nums",
                parsed.type === "income"
                  ? "bg-[var(--positive-soft)] text-positive"
                  : "bg-[var(--negative-soft)] text-negative",
              ].join(" ")}
            >
              {parsed.type === "income" ? "+" : "−"}
              {formatMYR(parsed.amount)}
            </span>
            <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-muted-foreground">
              {friendlyDate(parsed.txnDate)}
            </span>
            {parsed.note && (
              <span className="rounded-full border border-border bg-surface px-2.5 py-1 italic text-muted-foreground">
                &ldquo;{parsed.note}&rdquo;
              </span>
            )}
            <span
              className={[
                "ml-auto flex items-center gap-1 text-[10px] uppercase tracking-wider",
                parsed.confidence === "high"
                  ? "text-positive"
                  : parsed.confidence === "medium"
                    ? "text-warning"
                    : "text-subtle-foreground",
              ].join(" ")}
            >
              <Sparkles className="h-3 w-3" aria-hidden />
              {parsed.confidence} confidence
            </span>
          </div>
        ) : value.trim() ? (
          <p className="text-xs text-subtle-foreground">
            Need at least a number. Try <em>&ldquo;25 coffee&rdquo;</em> or{" "}
            <em>&ldquo;+500 salary&rdquo;</em>.
          </p>
        ) : (
          <p className="text-xs text-subtle-foreground">
            Tip: press <kbd className="rounded border border-border bg-surface px-1 py-0.5 text-[10px]">/</kbd>{" "}
            anywhere to focus this bar.
          </p>
        )}
      </div>

      {status.kind === "error" && (
        <p className="mt-2 text-xs text-negative">{status.msg}</p>
      )}
      {status.kind === "success" && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-positive">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          Added to {activeLedger?.name ?? "your ledger"}.
        </p>
      )}
      {speech.error && status.kind !== "saving" && (
        <p className="mt-2 text-xs text-negative">{speechErrorLabel(speech.error)}</p>
      )}
    </div>
  );
}

function speechErrorLabel(err: SpeechError): string {
  switch (err) {
    case "not-allowed":
      return "Microphone access blocked. Enable it in your browser settings.";
    case "no-speech":
      return "Didn't catch that — try again.";
    case "audio-capture":
      return "No microphone detected.";
    case "network":
      return "Voice recognition needs a network connection.";
    default:
      return "Voice input failed. Try typing instead.";
  }
}

function LedgerPickerDropdown({
  ledgers,
  activeId,
  onPick,
}: {
  ledgers: LedgerWithMembership[];
  activeId: string;
  onPick: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = ledgers.find((l) => l.id === activeId);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!active) return null;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex max-w-[180px] cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface-muted px-2 py-1 text-xs font-medium text-foreground transition-colors hover:bg-surface-strong"
        title="Switch ledger"
      >
        <span aria-hidden>{active.icon ?? "💼"}</span>
        <span className="max-w-[110px] truncate">{active.name}</span>
        {active.member_count > 1 && (
          <Users
            className="h-3 w-3 shrink-0 text-subtle-foreground"
            aria-label="shared"
          />
        )}
        <ChevronDown
          className="h-3 w-3 shrink-0 text-subtle-foreground"
          aria-hidden
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-1 w-64 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        >
          {ledgers.map((l) => (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(l.id);
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-surface-muted",
                  l.id === activeId ? "bg-surface-muted" : "",
                ].join(" ")}
              >
                <span className="text-base" aria-hidden>
                  {l.icon ?? "💼"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">
                    {l.name}
                  </span>
                  <span className="block text-[10px] uppercase tracking-wide text-subtle-foreground">
                    {l.role}
                    {l.member_count > 1 && ` · ${l.member_count} members`}
                  </span>
                </span>
                {l.id === activeId && (
                  <CheckCircle2
                    className="h-3.5 w-3.5 text-primary"
                    aria-label="active"
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
