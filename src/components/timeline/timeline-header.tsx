"use client";

import { useT } from "@/lib/i18n";

export function TimelineHeader() {
  const t = useT();
  return (
    <header className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {t("timeline.title")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("timeline.subtitle")}
      </p>
    </header>
  );
}
