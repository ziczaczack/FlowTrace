import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultLedger } from "@/lib/supabase/queries";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const ledger = await getOrCreateDefaultLedger(user.id);

  return (
    <main className="min-h-screen bg-[#0F2044] px-4 py-8 text-white">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-3xl font-semibold tracking-tight">FlowTrace</h1>
        <p className="mb-6 text-sm text-white/60">
          Ledger: {ledger.name} ({ledger.currency})
        </p>
        <DashboardClient ledgerId={ledger.id} />
      </div>
    </main>
  );
}
