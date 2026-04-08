import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExportButton } from "@/components/ui/export-button";

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

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Settings
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your account and preferences
          </p>
        </header>

        <div className="flex flex-col gap-5">
          {/* Profile */}
          <section className="glass-card rounded-2xl p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
              Profile
            </h2>
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-subtle-foreground">
                  Display name
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {displayName || "—"}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide text-subtle-foreground">
                  Email
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {user.email}
                </p>
              </div>
            </div>
          </section>

          {/* Preferences */}
          <section className="glass-card rounded-2xl p-5">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-subtle-foreground">
              Preferences
            </h2>
            <div className="flex items-center justify-between gap-3 text-sm">
              <div>
                <p className="text-sm font-medium text-foreground">Currency</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Used across all amounts and reports
                </p>
              </div>
              <select
                disabled
                value="MYR"
                className="cursor-not-allowed rounded-lg border border-border bg-surface-muted px-3 py-1.5 text-sm text-muted-foreground opacity-70"
              >
                <option value="MYR">MYR</option>
              </select>
            </div>
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
            <p className="mb-4 text-xs text-negative/80">
              Permanently delete your account and all related data.
            </p>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-lg border border-negative/40 px-3 py-1.5 text-xs font-semibold text-negative opacity-60"
            >
              Delete all data
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
