import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#10b981",
        }}
      >
        <svg
          width="120"
          height="120"
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
    ),
    size,
  );
}
