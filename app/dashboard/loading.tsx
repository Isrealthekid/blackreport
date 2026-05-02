import { SkeletonCard, SkeletonLine } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <SkeletonLine className="h-7 w-40" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
        <SkeletonCard rows={2} />
      </div>
      <SkeletonCard rows={4} />
      <SkeletonCard rows={4} />
    </div>
  );
}
