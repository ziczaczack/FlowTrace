"use client";

import { useT } from "@/lib/i18n";

export function SettingsPageHeader() {
  const t = useT();
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {t("settings.title")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("settings.subtitle")}
      </p>
    </header>
  );
}

/** Tiny `h2` with optional hint paragraph, both keys looked up via i18n. */
export function SectionHeading({
  titleKey,
  hintKey,
}: {
  titleKey: string;
  hintKey?: string;
}) {
  const t = useT();
  return (
    <>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
        {t(titleKey)}
      </h2>
      {hintKey && (
        <p className="mt-0.5 text-xs text-muted-foreground">{t(hintKey)}</p>
      )}
    </>
  );
}

export function TranslatedText({
  k,
  vars,
}: {
  k: string;
  vars?: Record<string, string | number>;
}) {
  const t = useT();
  return <>{t(k, vars)}</>;
}
