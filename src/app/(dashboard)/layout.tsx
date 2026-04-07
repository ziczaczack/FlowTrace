import type { ReactNode } from "react";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      {/* Desktop sidebar */}
      <DashboardNav variant="sidebar" />

      {/* Main content */}
      <main className="min-h-screen pb-20 md:ml-60 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <DashboardNav variant="bottom" />
    </div>
  );
}
