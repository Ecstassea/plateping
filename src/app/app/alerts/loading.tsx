import { ScreenSkeleton } from "@/components/Skeleton";
import { TabSkeleton } from "@/components/TabScreen";

export default function Loading() {
  return (
    <TabSkeleton>
      <ScreenSkeleton />
    </TabSkeleton>
  );
}
