import { ArrowRight } from "lucide-react";

import { Button, Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";

import type { MaterialRowViewModel } from "../model/types";

type RecentMaterialsSectionProps = {
  materials: MaterialRowViewModel[];
};

export function RecentMaterialsSection({
  materials,
}: RecentMaterialsSectionProps) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Recent materials</CardTitle>
          <Button variant="ghost" size="sm" disabled>
            View all
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {materials.length > 0 ? (
          materials.map((material) => (
            <div
              key={material.id}
              className="bg-surface-card rounded-[22px] px-4 py-4"
            >
              <span className="bg-surface text-muted-foreground inline-flex rounded-full px-2.5 py-1 text-xs font-semibold">
                {material.kind}
              </span>
              <p className="text-foreground mt-4 text-base leading-6 font-semibold">
                {material.title}
              </p>
              <p className="text-muted-foreground mt-3 text-sm">
                {material.supportingText}
              </p>
            </div>
          ))
        ) : (
          <div className="bg-surface-card rounded-[22px] px-4 py-4 md:col-span-2 xl:col-span-3">
            <p className="text-foreground text-sm font-semibold">
              No recent materials yet
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Reports and homework will appear here once the first reviewed
              lesson is prepared.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
