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

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const currentMonthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account, budgets, and preferences
          </p>
        </header>

        <div className="flex flex-col gap-5">
          {/* Profile */}
          <section className="glass-card rounded-2xl p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
              Profile
            </h2>
            <ProfileEditor
              initialName={displayName}
              email={user.email ?? ""}
            />
          </section>

          {/* Appearance */}
          <section className="glass-card rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
                  Appearance & behaviour
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Make FlowTrace feel like yours.
                </p>
              </div>
              <ThemeToggle />
            </div>
            <PreferencesPanel />
          </section>

          {/* Region */}
          <section className="glass-card rounded-2xl p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
              Region
            </h2>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">Currency</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Used across all amounts and reports.
                </p>
              </div>
              <span className="rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">
                MYR
              </span>
            </div>
          </section>

          {/* Monthly Budgets */}
          <section className="glass-card rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
                  Monthly Budgets
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {currentMonthLabel} · click{" "}
                  <svg
                    className="inline h-3 w-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>{" "}
                  on any category to set a limit
                </p>
              </div>
            </div>
            <BudgetManager initialItems={budgetItems} />
          </section>

          {/* Categories */}
          <section className="glass-card rounded-2xl p-5">
            <div className="mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
                Custom Categories
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Add your own expense or income categories in addition to the
                built-in system ones.
              </p>
            </div>
            <CategoriesManager initialCategories={categories} />
          </section>

          {/* Shared Ledgers */}
          <section className="glass-card rounded-2xl p-5">
            <div className="mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
                Shared Ledgers
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Invite someone to co-own a ledger by email. Members share
                transactions and recurring rules; budgets, savings goals, and
                AI insights stay personal.
              </p>
            </div>
            <LedgerShareManager
              ledgers={myLedgers}
              currentUserId={user.id}
            />
          </section>

          {/* Import bank statements */}
          <section className="glass-card rounded-2xl p-5">
            <div className="mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
                Import bank statement
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Upload a CSV from Maybank, CIMB, or Public Bank — preview,
                pick categories, then commit. Duplicates already in the
                ledger are skipped automatically.
              </p>
            </div>
            <CsvImport ledgers={myLedgers} categories={categories} />
          </section>

          {/* Export */}
          <section className="glass-card rounded-2xl p-5">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
              Export your data
            </h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Download every transaction across all ledgers as a CSV file.
            </p>
            <ExportButton label="Export all transactions" />
          </section>

          {/* Danger zone */}
          <section className="rounded-2xl border border-negative/30 bg-[var(--negative-soft)] p-5">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-negative">
              Danger zone
            </h2>
            <p className="text-xs text-negative/80">
              Account deletion is coming in a later release. In the meantime,
              you can export everything above for safekeeping.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
