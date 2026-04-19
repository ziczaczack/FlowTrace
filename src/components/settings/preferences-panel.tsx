"use client";

import { Check, Eye, EyeOff, Gauge, Palette, Sparkles } from "lucide-react";
import {
  ACCENT_PALETTES,
  type AccentPalette,
  type Density,
  usePreferences,
} from "@/hooks/use-preferences";

const DENSITY_OPTIONS: {
  id: Density;
  label: string;
  description: string;
}[] = [
  {
    id: "compact",
    label: "Compact",
    description: "More info on screen. Best for power users.",
  },
  {
    id: "comfortable",
    label: "Comfortable",
    description: "Balanced spacing. The default.",
  },
  {
    id: "spacious",
    label: "Spacious",
    description: "Roomier layout. Easier to scan.",
  },
];

export function PreferencesPanel() {
  const { prefs, update, reset } = usePreferences();

  return (
    <div className="space-y-6">
      {/* Accent palette */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">
            Accent palette
          </h3>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Changes the primary colour used across buttons, links, charts, and
          highlights. Persists across devices via your browser.
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.keys(ACCENT_PALETTES) as AccentPalette[]).map((id) => {
            const palette = ACCENT_PALETTES[id];
            const active = prefs.accent === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => update({ accent: id })}
                aria-pressed={active}
                className={[
                  "group relative flex items-start gap-3 rounded-xl border p-3 text-left transition-all",
                  active
                    ? "border-primary/60 bg-primary/5 ring-2 ring-[var(--ring)]"
                    : "border-border bg-surface hover:border-border-strong hover:bg-surface-muted",
                ].join(" ")}
              >
                <span
                  className="mt-0.5 block h-8 w-8 shrink-0 rounded-lg shadow-inner ring-1 ring-black/5"
                  style={{
                    background: `linear-gradient(135deg, ${palette.swatch}, ${palette.swatch}cc)`,
                  }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    {palette.label}
                    {active && (
                      <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
                    )}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
                    {palette.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Density */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">Density</h3>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          How tightly information is packed. Compact fits more per screen;
          spacious gives each element room to breathe.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {DENSITY_OPTIONS.map((opt) => {
            const active = prefs.density === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => update({ density: opt.id })}
                aria-pressed={active}
                className={[
                  "rounded-xl border px-3 py-3 text-left transition-all",
                  active
                    ? "border-primary/60 bg-primary/5 ring-2 ring-[var(--ring)]"
                    : "border-border bg-surface hover:border-border-strong hover:bg-surface-muted",
                ].join(" ")}
              >
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {opt.label}
                  {active && (
                    <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
                  )}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {opt.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toggles */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">
            Behaviour
          </h3>
        </div>
        <div className="space-y-2">
          <ToggleRow
            icon={prefs.privacy ? EyeOff : Eye}
            label="Privacy mode"
            description="Blur all monetary amounts. Hover or focus to reveal a single value. Toggle anywhere with P."
            active={prefs.privacy}
            onToggle={() => update({ privacy: !prefs.privacy })}
          />
          <ToggleRow
            label="Reduce motion"
            description="Minimise animations. Respects prefers-reduced-motion already — use this to override manually."
            active={prefs.reduceMotion}
            onToggle={() => update({ reduceMotion: !prefs.reduceMotion })}
          />
          <ToggleRow
            label="Show cents"
            description="Display the .00 on whole-ringgit amounts. Turn off for a cleaner dashboard."
            active={prefs.showCents}
            onToggle={() => update({ showCents: !prefs.showCents })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-xs text-subtle-foreground">
          Preferences are saved locally in your browser.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  active,
  onToggle,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon && (
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={active}
        onClick={onToggle}
        className={[
          "relative h-6 w-11 shrink-0 cursor-pointer rounded-full border transition-colors",
          active
            ? "border-primary bg-primary"
            : "border-border bg-surface-muted",
        ].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            active ? "translate-x-[20px]" : "translate-x-0",
          ].join(" ")}
        />
      </button>
    </div>
  );
}
