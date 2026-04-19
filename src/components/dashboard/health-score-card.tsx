"use client";

import { useEffect, useState } from "react";
import { Activity, Info } from "lucide-react";
import type { HealthScore } from "@/lib/health-score";

type Props = { score: HealthScore };

const RING_GRADIENT: Record<HealthScore["rating"], [string, string]> = {
  excellent: ["#10b981", "#06b6d4"],
  strong: ["#22c55e", "#84cc16"],
  fair: ["#eab308", "#f59e0b"],
  "needs-attention": ["#f97316", "#ef4444"],
  critical: ["#ef4444", "#b91c1c"],
};

const RATING_LABEL: Record<HealthScore["rating"], string> = {
  excellent: "Excellent",
  strong: "Strong",
  fair: "Fair",
  "needs-attention": "Needs attention",
  critical: "Critical",
};

// Animate the progress 0 → score on mount for a satisfying entry.
function useEase(target: number, duration = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setV(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

export function HealthScoreCard({ score }: Props) {
  const v = useEase(score.score);
  const [from, to] = RING_GRADIENT[score.rating];
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  // SVG ring math — stroke-dasharray trick on a circle.
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - v / 100);

  const active =
    score.components.find((c) => c.key === hoveredKey) ??
    {
      key: "summary" as const,
      label: "Overall",
      score: Math.round(v),
      max: 100,
      detail: score.nextAction ?? score.headline,
    };

  return (
    <div className="glass-card relative h-full overflow-hidden rounded-2xl p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/15 text-primary">
            <Activity className="h-3.5 w-3.5" aria-hidden />
          </span>
          <h3 className="text-sm font-semibold text-foreground">
            Financial health
          </h3>
        </div>
        <span
          className="rounded-full border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: to }}
        >
          {RATING_LABEL[score.rating]}
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Ring */}
        <div className="relative h-[140px] w-[140px] shrink-0">
          <svg
            viewBox="0 0 140 140"
            className="h-full w-full -rotate-90"
            aria-hidden
          >
            <defs>
              <linearGradient id="hs-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={from} />
                <stop offset="100%" stopColor={to} />
              </linearGradient>
            </defs>
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="var(--surface-muted)"
              strokeWidth="10"
            />
            <circle
              cx="70"
              cy="70"
              r={radius}
              fill="none"
              stroke="url(#hs-grad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 120ms ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <p className="amount-sensitive text-[30px] font-semibold tracking-tight tabular-nums text-foreground">
              {Math.round(v)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-subtle-foreground">
              / 100
            </p>
          </div>
        </div>

        {/* Breakdown bars */}
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-sm font-medium text-foreground">
            {score.headline}
          </p>
          <ul className="space-y-2">
            {score.components.map((c) => {
              const pct = (c.score / c.max) * 100;
              const isHovered = hoveredKey === c.key;
              return (
                <li
                  key={c.key}
                  onMouseEnter={() => setHoveredKey(c.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  className="cursor-help"
                >
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span
                      className={[
                        "font-medium transition-colors",
                        isHovered ? "text-foreground" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {c.label}
                    </span>
                    <span className="font-semibold tabular-nums text-foreground">
                      {c.score}
                      <span className="text-subtle-foreground">/{c.max}</span>
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${from}, ${to})`,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Active tip at bottom */}
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-surface-muted/60 px-3 py-2.5 text-[12px] leading-snug text-muted-foreground">
        <Info
          className="mt-[1px] h-3.5 w-3.5 shrink-0 text-subtle-foreground"
          aria-hidden
        />
        <p>
          <span className="font-medium text-foreground">{active.label}:</span>{" "}
          {active.detail}
        </p>
      </div>
    </div>
  );
}
