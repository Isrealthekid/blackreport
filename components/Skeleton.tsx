// Lightweight pulse-skeleton primitives. Composable.

export function SkeletonLine({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-neutral-800 rounded ${className || "h-4 w-full"}`}
    />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="border border-neutral-800 rounded-lg p-4 space-y-3">
      <SkeletonLine className="h-4 w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} className="h-3 w-full" />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border border-neutral-800 rounded-lg p-4 flex items-center justify-between gap-4"
        >
          <div className="flex-1 space-y-2">
            <SkeletonLine className="h-4 w-1/4" />
            <SkeletonLine className="h-3 w-1/2" />
          </div>
          <SkeletonLine className="h-7 w-20" />
        </div>
      ))}
    </div>
  );
}
