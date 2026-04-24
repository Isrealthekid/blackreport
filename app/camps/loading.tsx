import { SkeletonLine, SkeletonList } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <SkeletonLine className="h-7 w-24" />
      <SkeletonLine className="h-3 w-48 mt-2" />
      <div className="mt-6">
        <SkeletonList count={4} />
      </div>
    </div>
  );
}
