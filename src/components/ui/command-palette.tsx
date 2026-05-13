"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart2,
  CalendarDays,
  Download,
  EyeOff,
  Keyboard,
  LayoutDashboard,
  List,
  Moon,
  Palette,
  Plus,
  Search,
  Settings,
  Sun,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { usePreferences } from "@/hooks/use-preferences";
import { useTheme } from "@/hooks/use-theme";
import { TransactionModal } from "@/components/ui/transaction-modal";
import type { NewTransaction } from "@/types/forms";
import { useT } from "@/lib/i18n";

type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  keywords?: string;
  run: () => void | Promise<void>;
};

type Section = { heading: string; items: CommandItem[] };

export function CommandPalette({ ledgerId }: { ledgerId: string | null }) {
  const router = useRouter();
  const t = useT();
  const { togglePrivacy, prefs, update } = usePreferences();
  const { theme, toggle: toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Global Cmd+K / Ctrl+K, plus the advertised `N` shortcut that opens
  // the new-transaction modal directly.
  useEffect(() => {
    const isEditable = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => {
          if (o) return false;
          setQuery("");
          setActiveIndex(0);
          requestAnimationFrame(() => inputRef.current?.focus());
          return true;
        });
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      } else if (
        e.key.toLowerCase() === "n" &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.shiftKey &&
        !isEditable(e.target) &&
        ledgerId
      ) {
        e.preventDefault();
        setModalOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, ledgerId]);

  const sections: Section[] = useMemo(
    () => [
      {
        heading: t("commandPalette.actions"),
        items: [
          {
            id: "new-txn",
            label: t("dashboard.addTransaction"),
            hint: "N",
            icon: Plus,
            keywords: "add new create expense income 添加 新增",
            run: () => {
              setOpen(false);
              if (ledgerId) setModalOpen(true);
              else router.push("/");
            },
          },
          {
            id: "toggle-theme",
            label: theme === "dark" ? "Light mode" : "Dark mode",
            icon: theme === "dark" ? Sun : Moon,
            keywords: "dark light mode 主题 深色 浅色",
            run: () => {
              toggleTheme();
              setOpen(false);
            },
          },
          {
            id: "toggle-privacy",
            label: t("prefs.privacyMode"),
            hint: "P",
            icon: EyeOff,
            keywords: "blur hide amounts discreet 隐私",
            run: () => {
              togglePrivacy();
              setOpen(false);
            },
          },
          {
            id: "cycle-accent",
            label: t("prefs.accentPalette"),
            icon: Palette,
            keywords: "theme palette colour color 主题 颜色",
            run: () => {
              const order = [
                "emerald",
                "ocean",
                "violet",
                "sunset",
                "rose",
                "slate",
              ] as const;
              const idx = order.indexOf(prefs.accent);
              const next = order[(idx + 1) % order.length];
              update({ accent: next });
              setOpen(false);
            },
          },
          {
            id: "export-csv",
            label: "Export CSV",
            icon: Download,
            keywords: "download csv export data backup spreadsheet 导出",
            run: () => {
              setOpen(false);
              window.location.href = "/api/export";
            },
          },
          {
            id: "show-shortcuts",
            label: t("shortcuts.title"),
            hint: "?",
            icon: Keyboard,
            keywords: "help kbd guide hotkeys 快捷键",
            run: () => {
              setOpen(false);
              window.dispatchEvent(
                new KeyboardEvent("keydown", { key: "?" }),
              );
            },
          },
        ],
      },
      {
        heading: t("commandPalette.pages"),
        items: [
          {
            id: "go-dashboard",
            label: t("nav.dashboard"),
            icon: LayoutDashboard,
            keywords: "home overview 首页 仪表盘",
            run: () => {
              router.push("/");
              setOpen(false);
            },
          },
          {
            id: "go-timeline",
            label: t("nav.timeline"),
            icon: List,
            keywords: "transactions history feed 时间线 历史",
            run: () => {
              router.push("/timeline");
              setOpen(false);
            },
          },
          {
            id: "go-calendar",
            label: t("nav.calendar"),
            icon: CalendarDays,
            keywords: "month grid day heatmap 日历",
            run: () => {
              router.push("/calendar");
              setOpen(false);
            },
          },
          {
            id: "go-analytics",
            label: t("nav.analytics"),
            icon: BarChart2,
            keywords: "reports charts breakdown 分析 报告 图表",
            run: () => {
              router.push("/analytics");
              setOpen(false);
            },
          },
          {
            id: "go-settings",
            label: t("nav.settings"),
            icon: Settings,
            keywords: "profile budgets categories preferences 设置 偏好",
            run: () => {
              router.push("/settings");
              setOpen(false);
            },
          },
        ],
      },
      {
        heading: t("settings.sectionBudgets"),
        items: [
          {
            id: "go-budgets",
            label: t("settings.sectionBudgets"),
            icon: Wallet,
            keywords: "limits spending caps 预算",
            run: () => {
              router.push("/settings#budgets");
              setOpen(false);
            },
          },
        ],
      },
    ],
    [
      t,
      ledgerId,
      router,
      togglePrivacy,
      prefs.privacy,
      prefs.accent,
      update,
      theme,
      toggleTheme,
    ],
  );

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((s) => ({
        ...s,
        items: s.items.filter((i) =>
          `${i.label} ${i.keywords ?? ""}`.toLowerCase().includes(q),
        ),
      }))
      .filter((s) => s.items.length > 0);
  }, [sections, query]);

  const flatItems = useMemo(
    () => filteredSections.flatMap((s) => s.items),
    [filteredSections],
  );

  // Clamp the active index to valid range without a state-syncing effect.
  const boundedActive =
    flatItems.length === 0 ? 0 : Math.min(activeIndex, flatItems.length - 1);

  async function handleSave(data: NewTransaction) {
    if (!ledgerId) throw new Error("No ledger");
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ledgerId, ...data }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error ?? "Failed to add transaction");
    }
    router.refresh();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(flatItems.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      flatItems[boundedActive]?.run();
    }
  }

  return (
    <>
      <div
        aria-hidden={!open}
        className={[
          "fixed inset-0 z-50 transition-opacity",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        ].join(" ")}
      >
        <div
          onClick={() => setOpen(false)}
          className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("commandPalette.placeholder")}
          className={[
            "glass-card-strong absolute left-1/2 top-[18%] w-[min(92vw,540px)] -translate-x-1/2 overflow-hidden rounded-2xl",
            "transition-transform duration-200 ease-out",
            open ? "scale-100" : "scale-95",
          ].join(" ")}
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Search
              className="h-4 w-4 shrink-0 text-subtle-foreground"
              aria-hidden
            />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t("commandPalette.placeholder")}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground"
            />
            <kbd className="hidden rounded border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-subtle-foreground sm:inline-block">
              ESC
            </kbd>
          </div>

          <ul
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto py-1.5"
            role="listbox"
          >
            {filteredSections.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-subtle-foreground">
                {t("commandPalette.empty")}
              </li>
            )}
            {filteredSections.map((section) => {
              const offset = filteredSections
                .slice(0, filteredSections.indexOf(section))
                .reduce((n, s) => n + s.items.length, 0);
              return (
                <li key={section.heading}>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-subtle-foreground">
                    {section.heading}
                  </p>
                  <ul>
                    {section.items.map((item, idx) => {
                      const flatIdx = offset + idx;
                      const active = flatIdx === boundedActive;
                      const Icon = item.icon;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onMouseEnter={() => setActiveIndex(flatIdx)}
                            onClick={() => item.run()}
                            className={[
                              "flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-sm transition-colors",
                              active
                                ? "bg-primary/12 text-foreground"
                                : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "grid h-8 w-8 place-items-center rounded-lg",
                                active
                                  ? "bg-primary/20 text-primary"
                                  : "bg-surface-muted text-muted-foreground",
                              ].join(" ")}
                            >
                              <Icon className="h-4 w-4" aria-hidden />
                            </span>
                            <span className="flex-1 text-left font-medium">
                              {item.label}
                            </span>
                            {item.hint && (
                              <kbd className="rounded border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-medium text-subtle-foreground">
                                {item.hint}
                              </kbd>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between border-t border-border bg-surface-muted/50 px-4 py-2 text-[11px] text-subtle-foreground">
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-surface px-1 py-0.5">
                  ↑↓
                </kbd>
                {t("shortcuts.navigate")}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-surface px-1 py-0.5">
                  ↵
                </kbd>
                {t("common.confirm")}
              </span>
            </span>
            <span className="font-medium text-foreground/70">FlowTrace</span>
          </div>
        </div>
      </div>

      <TransactionModal
        open={modalOpen}
        mode="create"
        onSave={handleSave}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
