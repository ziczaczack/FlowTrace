import type { HTMLAttributes } from "react";

export function Skeleton({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={["animate-pulse bg-surface-muted", className ?? ""].join(" ")}
      {...rest}
    />
  );
}

export function SkeletonSummaryCards() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-28 rounded-2xl" />
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return <Skeleton className="h-[220px] w-full rounded-2xl" />;
}

export function SkeletonTimeline() {
  return (
    <div className="flex flex-col gap-6">
      {[0, 1, 2].map((g) => (
        <div key={g}>
          <div className="mb-2 flex items-center gap-3">
            <Skeleton className="h-3 w-16 rounded" />
            <div className="h-px flex-1 bg-surface-muted" />
            <Skeleton className="h-3 w-12 rounded" />
          </div>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 + (g % 2) }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonDonut() {
  return (
    <div className="flex flex-col items-center gap-4">
      <Skeleton className="h-[180px] w-[180px] rounded-full" />
      <div className="grid w-full grid-cols-2 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-8 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
