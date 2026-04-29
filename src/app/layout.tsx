import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "FlowTrace — Personal finance, finally calm",
  description:
    "Track every ringgit. Visual dashboards, low-friction entry, and monthly reports for individual investors.",
  applicationName: "FlowTrace",
  openGraph: {
    title: "FlowTrace — Personal finance, finally calm",
    description:
      "Low-friction entry. Visual dashboards. Monthly reports for individual investors.",
    siteName: "FlowTrace",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FlowTrace — Personal finance, finally calm",
    description:
      "Low-friction entry. Visual dashboards. Monthly reports for individual investors.",
  },
};

// Inline script: read the persisted theme & preferences BEFORE first paint
// so the right .dark class, accent palette, density, and privacy mode are
// all on <html> immediately. Eliminates flash on hard reload.
const themeBootScript = `
(function () {
  try {
    var stored = localStorage.getItem('flowtrace-theme');
    var theme = stored === 'light' || stored === 'dark' ? stored : 'dark';
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  } catch (e) {}
  try {
    var raw = localStorage.getItem('flowtrace-prefs');
    var prefs = raw ? JSON.parse(raw) : {};
    var accent = ['emerald','ocean','violet','sunset','rose','slate'].indexOf(prefs.accent) >= 0 ? prefs.accent : 'emerald';
    var density = ['compact','comfortable','spacious'].indexOf(prefs.density) >= 0 ? prefs.density : 'comfortable';
    document.documentElement.setAttribute('data-accent', accent);
    document.documentElement.setAttribute('data-density', density);
    if (prefs.privacy) document.documentElement.classList.add('privacy-mode');
    if (prefs.reduceMotion) document.documentElement.classList.add('reduce-motion');
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
        <script
          id="theme-boot"
          dangerouslySetInnerHTML={{ __html: themeBootScript }}
        />
      </head>
      <body className="min-h-full bg-bg text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
