import {
  AlertTriangle,
  Flame,
  Gauge,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { Insight, InsightIcon, InsightTone } from "@/lib/insights";

const ICONS: Record<InsightIcon, LucideIcon> = {
  pace: Gauge,
  surge: Flame,
  budget: AlertTriangle,
  streak: Sparkles,
};

const TONE_STYLES: Record<
  InsightTone,
  { bg: string; ring: string; icon: string }
> = {
  positive: {
    bg: "bg-[var(--positive-soft)]",
    ring: "ring-positive/20",
    icon: "text-positive",
  },
  neutral: {
    bg: "bg-surface-muted",
    ring: "ring-border",
    icon: "text-accent",
  },
  warning: {
    bg: "bg-[var(--warning-soft)]",
    ring: "ring-warning/20",
    icon: "text-warning",
  },
  negative: {
    bg: "bg-[var(--negative-soft)]",
    ring: "ring-negative/20",
    icon: "text-negative",
  },
};

export function SmartInsights({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) return null;

  return (
    <section className="glass-card rounded-2xl p-5 sm:p-6">
      <header className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="text-[13px] font-medium uppercase tracking-[0.14em] text-subtle-foreground">
          Insights for you
        </h2>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {insights.map((insight) => {
          const Icon = ICONS[insight.icon];
          const tone = TONE_STYLES[insight.tone];
          return (
            <article
              key={insight.id}
              className="group relative overflow-hidden rounded-xl border border-border bg-surface/60 p-4 transition-colors hover:bg-surface"
            >
              <div
                className={[
                  "mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1",
                  tone.bg,
                  tone.ring,
                ].join(" ")}
              >
                <Icon className={`h-4 w-4 ${tone.icon}`} aria-hidden />
              </div>
              <p className="text-sm font-semibold leading-snug text-foreground">
                {insight.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {insight.detail}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
