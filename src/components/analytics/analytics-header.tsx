"use client";

import { useT } from "@/lib/i18n";

export function AnalyticsHeader() {
  const t = useT();
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {t("analytics.title")}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {t("analytics.subtitle")}
      </p>
    </div>
  );
}
