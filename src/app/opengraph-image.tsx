import { ImageResponse } from "next/og";

export const alt = "FlowTrace — Personal finance, finally calm";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "88px",
          background:
            "linear-gradient(135deg, #ecfdf5 0%, #ffffff 55%, #f0fdfa 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "28px",
            marginBottom: "48px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "120px",
              height: "120px",
              background: "#10b981",
              borderRadius: "30px",
              boxShadow: "0 24px 48px -20px rgba(16, 185, 129, 0.55)",
            }}
          >
            <svg
              width="76"
              height="76"
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
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 700,
              color: "#0f172a",
              letterSpacing: "-0.02em",
            }}
          >
            FlowTrace
          </div>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 68,
            fontWeight: 600,
            color: "#0f172a",
            letterSpacing: "-0.025em",
            lineHeight: 1.1,
            maxWidth: 920,
          }}
        >
          Personal finance, finally calm.
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: "#475569",
            marginTop: "28px",
            maxWidth: 880,
            lineHeight: 1.4,
          }}
        >
          Low-friction entry. Visual dashboards. Monthly reports.
        </div>
      </div>
    ),
    size,
  );
}
