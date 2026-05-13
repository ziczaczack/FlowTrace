import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExportButton } from "@/components/ui/export-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ProfileEditor } from "@/components/settings/profile-editor";
import { BudgetManager } from "@/components/settings/budget-manager";
import { CategoriesManager } from "@/components/settings/categories-manager";
import { PreferencesPanel } from "@/components/settings/preferences-panel";
import { LedgerShareManager } from "@/components/settings/ledger-share-manager";
import { CsvImport } from "@/components/settings/csv-import";
import {
  SettingsPageHeader,
  SectionHeading,
  TranslatedText,
} from "@/components/settings/settings-strings";
import {
  getCategoryBudgetOverview,
  getCategories,
  getMyLedgers,
} from "@/lib/supabase/queries";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const meta = user.user_metadata ?? {};
  const displayName =
    (meta.full_name as string | undefined) ??
    (meta.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "";

  const now = new Date();
  const [budgetItems, categories, myLedgers] = await Promise.all([
    getCategoryBudgetOverview(user.id, now.getMonth() + 1, now.getFullYear()),
    getCategories(user.id),
    getMyLedgers(user.id),
  ]);

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <SettingsPageHeader />

        <div className="flex flex-col gap-5">
          {/* Profile */}
          <section className="glass-card rounded-2xl p-5">
            <div className="mb-4">
              <SectionHeading titleKey="settings.sectionProfile" />
            </div>
            <ProfileEditor
              initialName={displayName}
              email={user.email ?? ""}
            />
          </section>

          {/* Appearance */}
          <section className="glass-card rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <SectionHeading
                  titleKey="settings.appearance"
                  hintKey="settings.appearanceHint"
                />
              </div>
              <ThemeToggle />
            </div>
            <PreferencesPanel />
          </section>

          {/* Region */}
          <section className="glass-card rounded-2xl p-5">
            <div className="mb-3">
              <SectionHeading titleKey="settings.region" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  <TranslatedText k="settings.currency" />
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <TranslatedText k="settings.currencyHint" />
                </p>
              </div>
              <span className="rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">
                MYR
              </span>
            </div>
          </section>

          {/* Monthly Budgets */}
          <section className="glass-card rounded-2xl p-5">
            <div className="mb-4">
              <SectionHeading
                titleKey="settings.monthlyBudgets"
                hintKey="settings.monthlyBudgetsHint"
              />
            </div>
            <BudgetManager initialItems={budgetItems} />
          </section>

          {/* Categories */}
          <section className="glass-card rounded-2xl p-5">
            <div className="mb-4">
              <SectionHeading
                titleKey="settings.customCategories"
                hintKey="settings.customCategoriesHint"
              />
            </div>
            <CategoriesManager initialCategories={categories} />
          </section>

          {/* Shared Ledgers */}
          <section className="glass-card rounded-2xl p-5">
            <div className="mb-4">
              <SectionHeading
                titleKey="settings.sharedLedgers"
                hintKey="settings.sharedLedgersHint"
              />
            </div>
            <LedgerShareManager
              ledgers={myLedgers}
              currentUserId={user.id}
            />
          </section>

          {/* Import bank statements */}
          <section className="glass-card rounded-2xl p-5">
            <div className="mb-4">
              <SectionHeading
                titleKey="settings.importBank"
                hintKey="settings.importBankHint"
              />
            </div>
            <CsvImport ledgers={myLedgers} categories={categories} />
          </section>

          {/* Export */}
          <section className="glass-card rounded-2xl p-5">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
              <TranslatedText k="settings.exportData" />
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              <TranslatedText k="settings.exportDataHint" />
            </p>
            <ExportButton />
          </section>

          {/* Danger zone */}
          <section className="rounded-2xl border border-negative/30 bg-[var(--negative-soft)] p-5">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-negative">
              <TranslatedText k="settings.dangerZone" />
            </h2>
            <p className="text-xs text-negative/80">
              <TranslatedText k="settings.dangerZoneHint" />
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
