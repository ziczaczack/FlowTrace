import { createClient } from "@/lib/supabase/server";

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Cash",
  card: "Card",
  "e-wallet": "E-Wallet",
  bank_transfer: "Bank Transfer",
};

const TYPE_LABELS: Record<string, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function firstDayOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}
function lastDayOfMonth(year: number, month: number): string {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
}

type Row = {
  amount: string;
  type: string;
  payment_method: string | null;
  note: string | null;
  txn_date: string;
  category: { name: string } | { name: string }[] | null;
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { searchParams } = new URL(request.url);
  const ledgerId = searchParams.get("ledgerId");
  const monthParam = searchParams.get("month");
  const yearParam = searchParams.get("year");
  const month = monthParam ? Number(monthParam) : null;
  const year = yearParam ? Number(yearParam) : null;

  // Resolve ledger ids accessible to this user.
  let ledgerIds: string[];
  if (ledgerId) {
    ledgerIds = [ledgerId];
  } else {
    const { data: ledgerRows, error: ledgerError } = await supabase
      .from("ledgers")
      .select("id")
      .eq("user_id", user.id);
    if (ledgerError) {
      return new Response(
        JSON.stringify({ error: ledgerError.message }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
    ledgerIds = (ledgerRows ?? []).map((l) => l.id as string);
  }

  let query = supabase
    .from("transactions")
    .select(
      `
      amount, type, payment_method, note, txn_date,
      category:categories ( name )
      `,
    )
    .in("ledger_id", ledgerIds)
    .order("txn_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (month && year) {
    query = query
      .gte("txn_date", firstDayOfMonth(year, month))
      .lte("txn_date", lastDayOfMonth(year, month));
  }

  const { data, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rows = (data ?? []) as unknown as Row[];

  const header = [
    "Date",
    "Type",
    "Category",
    "Amount (MYR)",
    "Payment Method",
    "Note",
  ];
  const lines: string[] = [header.join(",")];

  for (const row of rows) {
    const cat = Array.isArray(row.category) ? row.category[0] : row.category;
    const value = parseFloat(row.amount);
    const signed = row.type === "expense" ? -Math.abs(value) : value;
    const amountStr = Number.isFinite(signed) ? signed.toFixed(2) : "0.00";
    const fields = [
      row.txn_date,
      TYPE_LABELS[row.type] ?? row.type,
      cat?.name ?? "",
      amountStr,
      row.payment_method ? PAYMENT_LABELS[row.payment_method] ?? "" : "",
      row.note ?? "",
    ].map((s) => csvEscape(String(s)));
    lines.push(fields.join(","));
  }

  const csv = lines.join("\r\n");
  const filename =
    month && year
      ? `flowtrace-${year}-${String(month).padStart(2, "0")}.csv`
      : "flowtrace-all.csv";

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
