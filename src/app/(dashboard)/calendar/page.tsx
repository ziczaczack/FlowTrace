import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCalendarMonthData } from "@/lib/supabase/queries";
import { CalendarView } from "@/components/calendar/calendar-view";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const now = new Date();
  const month = clampMonth(Number(params.month) || now.getMonth() + 1);
  const year = clampYear(Number(params.year) || now.getFullYear());

  const dayMap = await getCalendarMonthData(user.id, month, year);
  const days = Array.from(dayMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="px-4 py-8 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-subtle-foreground">
            Calendar
          </p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">
            Every ringgit, day by day
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Click any day to see the transactions. Arrow keys move between
            months.
          </p>
        </header>
        <CalendarView month={month} year={year} days={days} />
      </div>
    </div>
  );
}

function clampMonth(m: number): number {
  if (!Number.isFinite(m) || m < 1) return 1;
  if (m > 12) return 12;
  return Math.floor(m);
}

function clampYear(y: number): number {
  if (!Number.isFinite(y)) return new Date().getFullYear();
  return Math.max(2000, Math.min(2100, Math.floor(y)));
}
