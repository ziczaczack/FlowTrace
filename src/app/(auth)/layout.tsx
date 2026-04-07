import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-[#0F2044] flex items-center justify-center px-4 py-12">
      {children}
    </div>
  );
}
