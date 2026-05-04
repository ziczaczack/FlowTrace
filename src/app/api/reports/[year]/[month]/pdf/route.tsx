import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { generateMonthlyReport, getReportFor } from "@/lib/reports";
import { MonthlyReportPdf } from "@/lib/pdf/monthly-report";

// @react-pdf/renderer needs Node APIs (Buffer). Edge runtime won't work here.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = { params: Promise<{ year: string; month: string }> };

export async function GET(_req: Request, ctx: RouteParams) {
  const { year: yStr, month: mStr } = await ctx.params;
  const year = Number(yStr);
  const month = Number(mStr);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    month < 1 ||
    month > 12 ||
    year < 2000 ||
    year > 2100
  ) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let report = await getReportFor(user.id, year, month);
  if (!report) {
    try {
      report = await generateMonthlyReport(user.id, year, month);
    } catch {
      return NextResponse.json(
        { error: "could not generate report" },
        { status: 500 },
      );
    }
  }

  const buffer = await renderToBuffer(<MonthlyReportPdf report={report} />);

  const filename = `flowtrace-${year}-${String(month).padStart(2, "0")}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
