import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui";

import type { GameAnalysisSummaryViewModel } from "../model";

import { ToneBadge } from "./tone-badge";

type GameSummaryCardProps = {
  summary: GameAnalysisSummaryViewModel;
};

export function GameSummaryCard({ summary }: GameSummaryCardProps) {
  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="space-y-2">
          <CardTitle>Сводка по партии</CardTitle>
          <div className="flex flex-wrap gap-2">
            <ToneBadge label={summary.confidenceLabel} tone="neutral" />
            <ToneBadge label={summary.annotationCoverageLabel} tone="neutral" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          {summary.openingName ? (
            <p className="text-foreground text-sm font-semibold">
              {summary.openingName}
            </p>
          ) : null}
          <p className="text-foreground text-sm leading-6">
            {summary.overallDiagnosis}
          </p>
        </div>

        {summary.stats.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {summary.stats.map((stat) => (
              <ToneBadge
                key={stat.label}
                label={`${stat.count} ${stat.label.toLowerCase()}`}
                tone={stat.tone}
              />
            ))}
          </div>
        ) : null}

        {summary.recommendedLessonTitle ? (
          <div className="space-y-2">
            <Typography
              color={TYPOGRAPHY_COLOR.SECONDARY}
              variant={TYPOGRAPHY_VARIANT.CAPTION}
            >
              Следующий фокус урока
            </Typography>
            <p className="text-foreground text-sm font-semibold">
              {summary.recommendedLessonTitle}
            </p>
            {summary.recommendedLessonWhy ? (
              <p className="text-muted-foreground text-sm leading-6">
                {summary.recommendedLessonWhy}
              </p>
            ) : null}
          </div>
        ) : null}

        {summary.recommendedFocusPoints.length > 0 ? (
          <div className="space-y-2">
            <Typography
              color={TYPOGRAPHY_COLOR.SECONDARY}
              variant={TYPOGRAPHY_VARIANT.CAPTION}
            >
              На что обратить внимание
            </Typography>
            <ul className="space-y-2">
              {summary.recommendedFocusPoints.map((point) => (
                <li
                  key={point}
                  className="text-foreground flex items-start gap-2 text-sm leading-6"
                >
                  <span className="bg-accent mt-2 size-1.5 shrink-0 rounded-full" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {summary.reducedConfidenceWarning ? (
          <div className="border-danger/15 bg-danger/6 rounded-[22px] border px-4 py-4">
            <p className="text-danger text-sm font-semibold">
              Ограничение по уверенности
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              {summary.reducedConfidenceWarning}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
