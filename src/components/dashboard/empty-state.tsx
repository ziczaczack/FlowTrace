import { Wallet } from "lucide-react";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-20 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-surface-muted">
        <Wallet className="h-8 w-8 text-muted-foreground" aria-hidden />
      </div>
      <h2 className="mt-5 text-lg font-semibold text-foreground">
        Nothing here yet
      </h2>
      <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">
        Tap the + button to record your first transaction. It only takes a few
        seconds.
      </p>
    </div>
  );
}
