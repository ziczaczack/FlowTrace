"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, X, ShieldCheck } from "lucide-react";

const CONSENT_KEY = "flowtrace-ai-consent";

type State =
  | { kind: "idle" }
  | { kind: "consent" }
  | { kind: "streaming"; text: string }
  | { kind: "done"; text: string }
  | { kind: "error"; message: string };

export function AiExplainer() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const text =
    state.kind === "streaming" || state.kind === "done" ? state.text : "";

  function startFlow() {
    const consented =
      typeof window !== "undefined" &&
      window.localStorage.getItem(CONSENT_KEY) === "1";
    if (consented) {
      void runExplanation();
    } else {
      setState({ kind: "consent" });
    }
  }

  function grantConsentAndRun() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(CONSENT_KEY, "1");
    }
    void runExplanation();
  }

  async function runExplanation() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ kind: "streaming", text: "" });

    try {
      const res = await fetch("/api/insights/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: controller.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setState({
          kind: "error",
          message: data.error ?? `Request failed (${res.status}).`,
        });
        return;
      }
      if (!res.body) {
        setState({ kind: "error", message: "No response body." });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setState({ kind: "streaming", text: acc });
      }
      setState({ kind: "done", text: acc });
    } catch (err) {
      if (controller.signal.aborted) return;
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Stream interrupted.",
      });
    }
  }

  function close() {
    abortRef.current?.abort();
    setState({ kind: "idle" });
  }

  return (
    <>
      <button
        type="button"
        onClick={startFlow}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-surface-muted/40 px-4 py-3 text-left text-sm transition-colors hover:bg-surface-muted"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-medium text-foreground">
              Ask AI to explain this month
            </span>
            <span className="text-xs text-subtle-foreground">
              A short written analysis · aggregates only
            </span>
          </span>
        </span>
        <span className="text-xs font-medium text-primary">Try it →</span>
      </button>

      {state.kind === "consent" && (
        <ConsentModal
          onCancel={() => setState({ kind: "idle" })}
          onAccept={grantConsentAndRun}
        />
      )}

      {(state.kind === "streaming" ||
        state.kind === "done" ||
        state.kind === "error") && (
        <ResultPanel
          state={state}
          text={text}
          onClose={close}
          onRegenerate={() => void runExplanation()}
        />
      )}
    </>
  );
}

function ConsentModal({
  onCancel,
  onAccept,
}: {
  onCancel: () => void;
  onAccept: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        onClick={onCancel}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="glass-card-strong relative w-full max-w-md rounded-3xl p-6">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <h3 className="text-base font-semibold text-foreground">
            Send aggregates to the AI?
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          The AI provider will receive only monthly totals and
          category-level summaries. It does <strong>not</strong> see
          individual transactions, notes, merchants, or specific dates.
        </p>
        <ul className="mt-3 space-y-1.5 text-xs text-subtle-foreground">
          <li>· Income, expense, net flow for this month</li>
          <li>· Top expense categories (name + amount + share)</li>
          <li>· Active budgets (limit + spent)</li>
          <li>· Last month&apos;s expense for comparison</li>
        </ul>
        <p className="mt-3 text-xs text-subtle-foreground">
          Limit: 5 explanations per 24 hours. The provider&apos;s usage
          policies apply.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="cursor-pointer rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
          >
            Send aggregates
          </button>
        </div>
      </div>
    </div>
  );
}

function ResultPanel({
  state,
  text,
  onClose,
  onRegenerate,
}: {
  state: State;
  text: string;
  onClose: () => void;
  onRegenerate: () => void;
}) {
  const isStreaming = state.kind === "streaming";
  const isError = state.kind === "error";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 py-6 sm:items-center">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />
      <div className="glass-card-strong relative flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="text-sm font-semibold text-foreground">
              AI read on this month
            </h3>
            {isStreaming && (
              <Loader2
                className="h-3.5 w-3.5 animate-spin text-subtle-foreground"
                aria-hidden
              />
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-subtle-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isError ? (
            <p className="text-sm text-negative">
              {(state as { kind: "error"; message: string }).message}
            </p>
          ) : (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {text || (isStreaming ? "Thinking…" : "")}
            </p>
          )}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          <p className="text-[11px] text-subtle-foreground">
            Aggregates only · no transaction-level data sent
          </p>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isStreaming}
            className="cursor-pointer rounded-xl border border-border bg-surface-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            Regenerate
          </button>
        </footer>
      </div>
    </div>
  );
}
