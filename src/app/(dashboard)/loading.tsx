export default function DashboardLoading() {
  return (
    <div className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-32 w-full animate-pulse rounded-2xl bg-surface-muted" />
        <div className="h-64 w-full animate-pulse rounded-2xl bg-surface-muted" />
        <div className="h-64 w-full animate-pulse rounded-2xl bg-surface-muted" />
      </div>
    </div>
  );
}
