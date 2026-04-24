import { SkeletonLine, SkeletonList } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <SkeletonLine className="h-7 w-32 mb-2" />
          <SkeletonLine className="h-3 w-56" />
        </div>
        <SkeletonLine className="h-9 w-32" />
      </div>
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-5 gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border border-neutral-800 rounded-lg p-3 space-y-2">
            <SkeletonLine className="h-3 w-12" />
            <SkeletonLine className="h-6 w-10" />
          </div>
        ))}
      </div>
      <div className="mt-6 flex gap-4 border-b border-neutral-800 mb-5">
        <SkeletonLine className="h-8 w-24" />
        <SkeletonLine className="h-8 w-28" />
      </div>
      <SkeletonList count={5} />
    </div>
  );
}
