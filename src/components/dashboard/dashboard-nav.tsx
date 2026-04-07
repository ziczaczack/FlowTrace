"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  LayoutDashboard,
  List,
  Settings,
  type LucideIcon,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon };

const ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/timeline", label: "Timeline", icon: List },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav({ variant }: { variant: "sidebar" | "bottom" }) {
  const pathname = usePathname();

  if (variant === "sidebar") {
    return (
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col border-r border-[#2E4060] bg-[#0F2044] px-4 py-6 md:flex">
        <div className="mb-8 px-2 text-2xl font-semibold tracking-tight text-white">
          FlowTrace
        </div>
        <nav className="flex flex-col gap-1">
          {ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#10B981] text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white/90",
                ].join(" ")}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-4 border-t border-[#2E4060] bg-[#0F2044] md:hidden">
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            className={[
              "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
              active ? "text-[#10B981]" : "text-white/50 hover:text-white/80",
            ].join(" ")}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
