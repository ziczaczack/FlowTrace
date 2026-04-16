import type { ReactNode } from "react";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { CommandPalette } from "@/components/ui/command-palette";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultLedger } from "@/lib/supabase/queries";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ledger = user ? await getOrCreateDefaultLedger(user.id) : null;

  return (
    <div className="app-shell relative min-h-screen bg-bg text-foreground">
      {/* Desktop sidebar */}
      <DashboardNav variant="sidebar" />

      {/* Main content */}
      <main className="relative z-10 min-h-screen pb-24 md:ml-64 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <DashboardNav variant="bottom" />

      {/* Global Cmd+K command palette */}
      <CommandPalette ledgerId={ledger?.id ?? null} />
    </div>
  );
}
