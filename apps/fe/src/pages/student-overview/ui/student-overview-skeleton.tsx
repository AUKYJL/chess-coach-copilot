import { Card, CardContent, CardHeader, Skeleton } from "@/shared/ui";

export function SectionSkeletonCard({
  title,
  lines = 4,
  tall = false,
}: {
  title: string;
  lines?: number;
  tall?: boolean;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="gap-3">
        <Skeleton className="h-4 w-32" />
        <p className="sr-only">{title}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton
            key={index}
            className={tall && index === 0 ? "h-40 w-full rounded-[24px]" : "h-4 w-full"}
          />
        ))}
      </CardContent>
    </Card>
  );
}

export function StudentOverviewSkeleton() {
  return (
    <div className="space-y-6 xl:space-y-8">
      <div className="border-border bg-surface rounded-[32px] border px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <Skeleton className="size-[4.5rem] rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-11 w-36 rounded-2xl" />
            <Skeleton className="size-10 rounded-2xl" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="bg-surface-card border-0 shadow-none">
            <CardContent className="space-y-3 px-6 py-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-28" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.62fr)_minmax(320px,0.94fr)]">
        <SectionSkeletonCard title="Performance trend loading" lines={5} tall />
        <SectionSkeletonCard title="Recent games loading" lines={9} />
        <SectionSkeletonCard title="Progress insight loading" lines={4} />
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionSkeletonCard title="Weakness profile loading" lines={6} />
          <SectionSkeletonCard title="Next lesson loading" lines={6} />
        </div>
        <SectionSkeletonCard title="Recent materials loading" lines={4} />
        <SectionSkeletonCard title="Student context loading" lines={7} />
      </section>
    </div>
  );
}
