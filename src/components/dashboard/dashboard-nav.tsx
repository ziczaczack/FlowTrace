"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  CalendarDays,
  LayoutDashboard,
  List,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useT } from "@/lib/i18n";

type NavItem = { href: string; labelKey: string; icon: LucideIcon };

const ITEMS: NavItem[] = [
  { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/timeline", labelKey: "nav.timeline", icon: List },
  { href: "/calendar", labelKey: "nav.calendar", icon: CalendarDays },
  { href: "/analytics", labelKey: "nav.analytics", icon: BarChart2 },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav({ variant }: { variant: "sidebar" | "bottom" }) {
  const pathname = usePathname();
  const t = useT();

  if (variant === "sidebar") {
    return (
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-64 flex-col border-r border-border bg-surface/70 px-5 py-7 backdrop-blur-xl md:flex">
        <div className="mb-10 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground"
          >
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-fg shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M3 17l6-6 4 4 8-8" />
                <path d="M14 7h7v7" />
              </svg>
            </span>
            FlowTrace
          </Link>
          <ThemeToggle />
        </div>

        <nav className="flex flex-col gap-1">
          {ITEMS.map(({ href, labelKey, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-200 cursor-pointer",
                  active
                    ? "bg-primary text-primary-fg shadow-sm"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-[18px] w-[18px]" aria-hidden />
                {t(labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl border border-border bg-surface-muted/60 p-4 text-xs text-muted-foreground">
          <p className="flex items-center justify-between font-medium text-foreground">
            FlowTrace · MVP
            <kbd className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              ⌘ K
            </kbd>
          </p>
          <p className="mt-1 leading-relaxed">{t("nav.tagline")}</p>
        </div>
      </aside>
    );
  }

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-30 grid grid-cols-5 rounded-2xl border border-border bg-surface/85 px-1 py-1 shadow-[var(--shadow-elevated)] backdrop-blur-xl md:hidden">
      {ITEMS.map(({ href, labelKey, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium transition-colors duration-200 cursor-pointer",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden />
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
