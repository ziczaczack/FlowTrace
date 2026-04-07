import { Wallet } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0F2044]/50 px-6 py-16 text-center">
      <Wallet className="h-16 w-16 text-white/20" aria-hidden />
      <h2 className="mt-4 text-lg font-medium text-white">Nothing here yet</h2>
      <p className="mt-1 text-sm text-white/50">
        Tap + to record your first transaction
      </p>
    </div>
  );
}
