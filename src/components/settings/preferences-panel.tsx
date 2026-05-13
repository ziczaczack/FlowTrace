"use client";

import { Check, Eye, EyeOff, Gauge, Languages, Palette, Sparkles } from "lucide-react";
import {
  ACCENT_PALETTES,
  type AccentPalette,
  type Density,
  type Locale,
  usePreferences,
} from "@/hooks/use-preferences";
import { useT } from "@/lib/i18n";

const DENSITY_OPTIONS: Density[] = ["compact", "comfortable", "spacious"];
const LOCALE_OPTIONS: Locale[] = ["en", "zh-CN"];

export function PreferencesPanel() {
  const { prefs, update, reset } = usePreferences();
  const t = useT();

  const accentLabel = (id: AccentPalette) => t(`prefs.accent_${id}`);
  const accentDesc = (id: AccentPalette) => t(`prefs.accent_${id}_desc`);

  return (
    <div className="space-y-6">
      {/* Language */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Languages className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">
            {t("prefs.language")}
          </h3>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          {t("prefs.languageHint")}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {LOCALE_OPTIONS.map((id) => {
            const active = prefs.locale === id;
            const label = id === "en" ? t("prefs.locale_en") : t("prefs.locale_zh");
            const desc =
              id === "en" ? t("prefs.locale_en_desc") : t("prefs.locale_zh_desc");
            return (
              <button
                key={id}
                type="button"
                onClick={() => update({ locale: id })}
                aria-pressed={active}
                className={[
                  "rounded-xl border px-3 py-3 text-left transition-all",
                  active
                    ? "border-primary/60 bg-primary/5 ring-2 ring-[var(--ring)]"
                    : "border-border bg-surface hover:border-border-strong hover:bg-surface-muted",
                ].join(" ")}
              >
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {label}
                  {active && (
                    <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
                  )}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent palette */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold text-foreground">
            {t("prefs.accentPalette")}
          </h3>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">{t("prefs.accentHint")}</p>
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
                    {accentLabel(id)}
                    {active && (
                      <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
                    )}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-tight text-muted-foreground">
                    {accentDesc(id)}
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
          <h3 className="text-sm font-semibold text-foreground">
            {t("prefs.density")}
          </h3>
        </div>
        <p className="mb-3 text-xs text-muted-foreground">{t("prefs.densityHint")}</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {DENSITY_OPTIONS.map((id) => {
            const active = prefs.density === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => update({ density: id })}
                aria-pressed={active}
                className={[
                  "rounded-xl border px-3 py-3 text-left transition-all",
                  active
                    ? "border-primary/60 bg-primary/5 ring-2 ring-[var(--ring)]"
                    : "border-border bg-surface hover:border-border-strong hover:bg-surface-muted",
                ].join(" ")}
              >
                <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {t(`prefs.density_${id}`)}
                  {active && (
                    <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
                  )}
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {t(`prefs.density_${id}_desc`)}
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
            {t("prefs.behaviour")}
          </h3>
        </div>
        <div className="space-y-2">
          <ToggleRow
            icon={prefs.privacy ? EyeOff : Eye}
            label={t("prefs.privacyMode")}
            description={t("prefs.privacyHint")}
            active={prefs.privacy}
            onToggle={() => update({ privacy: !prefs.privacy })}
          />
          <ToggleRow
            label={t("prefs.reduceMotion")}
            description={t("prefs.reduceMotionHint")}
            active={prefs.reduceMotion}
            onToggle={() => update({ reduceMotion: !prefs.reduceMotion })}
          />
          <ToggleRow
            label={t("prefs.showCents")}
            description={t("prefs.showCentsHint")}
            active={prefs.showCents}
            onToggle={() => update({ showCents: !prefs.showCents })}
          />
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <p className="text-xs text-subtle-foreground">{t("prefs.savedLocally")}</p>
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          {t("prefs.resetToDefaults")}
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
