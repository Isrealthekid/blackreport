import { SkeletonLine, SkeletonList } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <SkeletonLine className="h-7 w-32" />
        <div className="flex gap-2">
          <SkeletonLine className="h-9 w-24" />
          <SkeletonLine className="h-9 w-24" />
        </div>
      </div>
      <SkeletonLine className="h-3 w-72 mt-2" />
      <div className="mt-6">
        <SkeletonList count={6} />
      </div>
    </div>
  );
}
