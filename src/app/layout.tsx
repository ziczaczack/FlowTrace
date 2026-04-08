import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FlowTrace — Personal finance, finally calm",
  description:
    "Track every ringgit. Visual dashboards, low-friction entry, and monthly reports for individual investors.",
};

// Inline script: read the persisted theme BEFORE first paint so the right
// .dark class is on <html> immediately. This eliminates the light/dark
// flash on hard reload.
const themeBootScript = `
(function () {
  try {
    var stored = localStorage.getItem('flowtrace-theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plex.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-boot" strategy="beforeInteractive">
          {themeBootScript}
        </Script>
      </head>
      <body className="min-h-full bg-bg text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
