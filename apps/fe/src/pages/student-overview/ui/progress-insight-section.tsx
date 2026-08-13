import { NotebookText } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui";

import type { ProgressInsightViewModel } from "../model";

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
        <p className="text-foreground max-w-3xl text-sm leading-7">
          {insight.summary}
        </p>
        <Typography
          color={TYPOGRAPHY_COLOR.SECONDARY}
          variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
        >
          {insight.supportingText}
        </Typography>
      </CardContent>
    </Card>
  );
}
