import type { ReactNode } from "react";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell relative min-h-screen bg-bg text-foreground">
      {/* Desktop sidebar */}
      <DashboardNav variant="sidebar" />

      {/* Main content */}
      <main className="relative z-10 min-h-screen pb-24 md:ml-64 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <DashboardNav variant="bottom" />
    </div>
  );
}
