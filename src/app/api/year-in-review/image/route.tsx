import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { getYearInReview } from "@/lib/supabase/queries";

// Force the Node.js runtime so we can use the Supabase server client
// (which depends on Next.js cookies). Edge would be faster but the
// cookies API isn't available there in the same way.
export const runtime = "nodejs";

const formatMYR = (n: number) =>
  `RM ${n.toLocaleString("en-MY", { maximumFractionDigits: 0 })}`;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Unauthenticated", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year")) || new Date().getFullYear();

  const review = await getYearInReview(user.id, year);
  if (!review) {
    return new Response("No data for year", { status: 404 });
  }

  const subtitle =
    review.activeMonths >= 12
      ? "A full year of tracked spending"
      : `${review.activeMonths} active month${review.activeMonths === 1 ? "" : "s"}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "72px 64px",
          background:
            "linear-gradient(160deg, #064e3b 0%, #0f172a 60%, #022c22 100%)",
          color: "#ecfdf5",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              background: "#10b981",
              borderRadius: 14,
            }}
          >
            <svg
              width="36"
              height="36"
              viewBox="0 0 64 64"
              fill="none"
              stroke="#ffffff"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 42 L26 30 L34 38 L50 22" />
              <path d="M36 22 H50 V36" />
            </svg>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 20, color: "#a7f3d0", letterSpacing: 1 }}>
              FlowTrace
            </span>
            <span style={{ fontSize: 16, color: "#6ee7b7" }}>
              Year in review
            </span>
          </div>
          <div
            style={{
              marginLeft: "auto",
              fontSize: 96,
              fontWeight: 700,
              color: "#10b981",
              letterSpacing: -2,
            }}
          >
            {review.year}
          </div>
        </div>

        {/* Big numbers */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 48,
            gap: 8,
          }}
        >
          <span style={{ fontSize: 24, color: "#86efac" }}>You spent</span>
          <span
            style={{
              fontSize: 132,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: -4,
              lineHeight: 1,
            }}
          >
            {formatMYR(review.totalExpense)}
          </span>
          <span style={{ fontSize: 22, color: "#6ee7b7", marginTop: 4 }}>
            across {review.txnCount.toLocaleString("en-MY")} transactions ·{" "}
            {subtitle}
          </span>
        </div>

        {/* Stat row */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginTop: 48,
          }}
        >
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: 24,
              borderRadius: 24,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span style={{ fontSize: 16, color: "#a7f3d0" }}>Net flow</span>
            <span
              style={{
                fontSize: 44,
                fontWeight: 700,
                color: review.netFlow >= 0 ? "#34d399" : "#fca5a5",
                marginTop: 6,
              }}
            >
              {review.netFlow >= 0 ? "+" : "−"}
              {formatMYR(Math.abs(review.netFlow))}
            </span>
          </div>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              padding: 24,
              borderRadius: 24,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <span style={{ fontSize: 16, color: "#a7f3d0" }}>Savings rate</span>
            <span
              style={{
                fontSize: 44,
                fontWeight: 700,
                color: "#ffffff",
                marginTop: 6,
              }}
            >
              {review.savingsRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Top categories */}
        {review.topCategories.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 40,
              gap: 14,
            }}
          >
            <span style={{ fontSize: 18, color: "#a7f3d0", letterSpacing: 2 }}>
              TOP SPENDING
            </span>
            {review.topCategories.map((c, i) => {
              const pct =
                review.totalExpense > 0
                  ? (c.total / review.totalExpense) * 100
                  : 0;
              return (
                <div
                  key={c.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    fontSize: 24,
                  }}
                >
                  <span
                    style={{
                      width: 36,
                      color: "#6ee7b7",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {i + 1}.
                  </span>
                  <span style={{ fontSize: 30 }}>{c.icon}</span>
                  <span style={{ flex: 1, color: "#ffffff" }}>{c.name}</span>
                  <span
                    style={{
                      color: "#a7f3d0",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {pct.toFixed(0)}%
                  </span>
                  <span
                    style={{
                      width: 200,
                      textAlign: "right",
                      color: "#ffffff",
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatMYR(c.total)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            paddingTop: 32,
            justifyContent: "space-between",
            color: "#6ee7b7",
            fontSize: 16,
          }}
        >
          <span>flowtrace · personal finance, finally calm</span>
          {review.biggestDay && (
            <span>
              Biggest day: {review.biggestDay.date} ·{" "}
              {formatMYR(review.biggestDay.total)}
            </span>
          )}
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
    },
  );
}
