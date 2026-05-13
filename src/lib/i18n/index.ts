"use client";

import { useMemo } from "react";
import { usePreferences, type Locale } from "@/hooks/use-preferences";
import { en, type Dictionary } from "./en";
import { zhCN } from "./zh-CN";

const DICTIONARIES: Record<Locale, Dictionary> = {
  en,
  "zh-CN": zhCN,
};

export type { Locale } from "@/hooks/use-preferences";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  "zh-CN": "简体中文",
};

/**
 * Walk a dot-path into the dictionary. Returns the string if found,
 * otherwise undefined.
 */
function lookup(dict: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined ? `{${k}}` : String(v);
  });
}

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

export function useT(): TFn {
  const { prefs } = usePreferences();
  const locale: Locale = prefs.locale ?? "en";
  return useMemo(() => {
    const dict = DICTIONARIES[locale] ?? en;
    return (key: string, vars?: Record<string, string | number>) => {
      const hit = lookup(dict, key) ?? lookup(en, key) ?? key;
      return interpolate(hit, vars);
    };
  }, [locale]);
}

export function useLocale(): Locale {
  const { prefs } = usePreferences();
  return prefs.locale ?? "en";
}

/**
 * Locale-aware date format helpers. These avoid hardcoding "en-MY" so
 * timeline/calendar render in Chinese when the user picks zh-CN.
 */
export function formatDate(
  date: Date,
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
): string {
  const bcp = locale === "zh-CN" ? "zh-CN" : "en-MY";
  return date.toLocaleDateString(bcp, options);
}

/**
 * Currency stays in MYR regardless of UI language — only the locale-formatting
 * rules change (e.g. grouping separators). For zh-CN we use zh-CN-u-nu-latn to
 * keep arabic digits.
 */
export function formatMoney(value: number, locale: Locale, showCents = true): string {
  const bcp = locale === "zh-CN" ? "zh-CN" : "en-MY";
  return value.toLocaleString(bcp, {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });
}

/**
 * Translate a system category name. User-created categories pass through
 * unchanged. Match is case-insensitive on the English source.
 */
export function translateCategoryName(name: string, t: TFn): string {
  const key = SYSTEM_CATEGORY_KEYS[name.trim().toLowerCase()];
  if (!key) return name;
  return t(`category.${key}`);
}

const SYSTEM_CATEGORY_KEYS: Record<string, string> = {
  food: "food",
  "food & dining": "food",
  dining: "food",
  transport: "transport",
  transportation: "transport",
  groceries: "groceries",
  grocery: "groceries",
  shopping: "shopping",
  entertainment: "entertainment",
  bills: "bills",
  "bills & utilities": "bills",
  utilities: "bills",
  health: "health",
  healthcare: "health",
  education: "education",
  travel: "travel",
  gifts: "gifts",
  "gifts & donations": "gifts",
  investments: "investments",
  investment: "investments",
  salary: "salary",
  freelance: "freelance",
  bonus: "bonus",
  refund: "refund",
  interest: "interest",
  other: "other",
  transfer: "transfer",
  unknown: "unknown",
};
