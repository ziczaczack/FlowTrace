"use client";

import { useEffect, useState } from "react";
import { UserMenu } from "@/components/dashboard/user-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useT, useLocale, formatDate } from "@/lib/i18n";

type Props = {
  email: string;
  fullName: string | null;
  firstName: string;
};

export function DashboardHeader({ email, fullName, firstName }: Props) {
  const t = useT();
  const locale = useLocale();
  // Render an empty placeholder on first paint to match SSR, then fill in
  // greeting/date once we know the client locale. Avoids hydration mismatch
  // and a brief flash of English text for zh-CN users.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const greetingKey =
    hour < 12
      ? "dashboard.greetingMorning"
      : hour < 18
        ? "dashboard.greetingAfternoon"
        : "dashboard.greetingEvening";

  const dateLabel = mounted
    ? formatDate(now, locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <header className="mb-8 flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-subtle-foreground">
          {dateLabel}
        </p>
        <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">
          {mounted ? t(greetingKey) : ""},{" "}
          <span className="text-primary">{firstName}</span>
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <div className="md:hidden">
          <ThemeToggle />
        </div>
        <UserMenu email={email} fullName={fullName} />
      </div>
    </header>
  );
}
