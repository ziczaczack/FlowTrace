"use client";

import { useT } from "@/lib/i18n";

export function CalendarHeader() {
  const t = useT();
  return (
    <header className="mb-6">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-subtle-foreground">
        {t("nav.calendar")}
      </p>
      <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">
        {t("calendar.title")}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {t("calendar.subtitle")}
      </p>
    </header>
  );
}
