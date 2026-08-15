import { Skeleton } from "@/shared/ui";

export function GameAnalysisSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 rounded-[28px]" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.88fr)_minmax(320px,0.96fr)]">
        <Skeleton className="h-[34rem] rounded-[28px]" />
        <Skeleton className="h-[34rem] rounded-[28px]" />
        <Skeleton className="h-[34rem] rounded-[28px]" />
      </div>
      <Skeleton className="h-52 rounded-[28px]" />
    </div>
  );
}
