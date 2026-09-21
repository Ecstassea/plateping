import { Skeleton } from "@/components/Skeleton";
import { TabSkeleton } from "@/components/TabScreen";

export default function Loading() {
  return (
    <TabSkeleton>
      <div className="space-y-5" role="status" aria-label="Loading">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </TabSkeleton>
  );
}
