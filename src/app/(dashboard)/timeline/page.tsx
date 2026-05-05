import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getMyLedgers,
  getTransactionsByMonth,
} from "@/lib/supabase/queries";
import { TransactionFeed } from "@/components/timeline/transaction-feed";
import { SkeletonTimeline } from "@/components/ui/skeleton";

type SearchParams = {
  month?: string;
  year?: string;
};

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const month = Number(params.month) || now.getMonth() + 1;
  const year = Number(params.year) || now.getFullYear();

  // Don't call getOrCreateDefaultLedger here — the dashboard layout already
  // bootstraps a ledger on the user's first visit. Calling it twice in the
  // same render tree (layout + page) used to occasionally race against a
  // transient RLS read miss and create a phantom "My Wallet". Read-only
  // here, fall back to dashboard if somehow no ledger exists.
  const ledgers = await getMyLedgers(user.id);
  const writable = ledgers.filter(
    (l) => l.role === "owner" || l.role === "editor",
  );
  if (writable.length === 0) redirect("/");
  const owned = writable.filter((l) => l.role === "owner");
  const defaultLedger =
    owned.find((l) => l.is_default) ?? owned[0] ?? writable[0];

  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Timeline
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every transaction across all ledgers
          </p>
        </header>

        <Suspense fallback={<SkeletonTimeline />}>
          <TimelineData
            userId={user.id}
            month={month}
            year={year}
            defaultLedgerId={defaultLedger.id}
            accountCreatedAt={user.created_at}
          />
        </Suspense>
      </div>
    </div>
  );
}

async function TimelineData({
  userId,
  month,
  year,
  defaultLedgerId,
  accountCreatedAt,
}: {
  userId: string;
  month: number;
  year: number;
  defaultLedgerId: string;
  accountCreatedAt?: string | null;
}) {
  const transactions = await getTransactionsByMonth(userId, month, year);
  return (
    <TransactionFeed
      initialTransactions={transactions}
      month={month}
      year={year}
      userId={userId}
      defaultLedgerId={defaultLedgerId}
      accountCreatedAt={accountCreatedAt}
    />
  );
}
