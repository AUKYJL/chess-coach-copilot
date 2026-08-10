import { NotebookText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";

import type { ProgressInsightViewModel } from "../model/types";

type ProgressInsightSectionProps = {
  insight: ProgressInsightViewModel | null;
};

export function ProgressInsightSection({
  insight,
}: ProgressInsightSectionProps) {
  if (!insight) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex items-center gap-2">
          <NotebookText className="text-accent size-4" />
          <CardTitle>{insight.title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-foreground max-w-3xl text-sm leading-7">{insight.summary}</p>
        <p className="text-muted-foreground text-sm">{insight.supportingText}</p>
      </CardContent>
    </Card>
  );
}
