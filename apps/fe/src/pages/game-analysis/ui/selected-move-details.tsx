import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui";

import type { GameAnalysisReplayMoveViewModel } from "../model";

import { ToneBadge } from "./tone-badge";

type DetailRowProps = {
  label: string;
  value: string | null;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="space-y-1.5">
      <Typography
        color={TYPOGRAPHY_COLOR.SECONDARY}
        variant={TYPOGRAPHY_VARIANT.CAPTION}
      >
        {label}
      </Typography>
      <p className="text-foreground text-sm leading-6">
        {value ?? "Нет данных"}
      </p>
    </div>
  );
}

type SelectedMoveDetailsProps = {
  move: GameAnalysisReplayMoveViewModel;
};

export function SelectedMoveDetails({ move }: SelectedMoveDetailsProps) {
  const moveCoordinates = move.actualMove
    ? `${move.actualMove.from} → ${move.actualMove.to}`
    : null;

  return (
    <Card className="h-full">
      <CardHeader className="gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{move.moveLabel}</CardTitle>
            <ToneBadge label="Обычный ход" tone="neutral" />
          </div>
          <Typography variant={TYPOGRAPHY_VARIANT.BODY_SMALL}>
            Анализ не выделил этот ход как отдельный критический момент.
          </Typography>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <DetailRow label="Оценка до" value={move.evaluationBeforeLabel} />
          <DetailRow label="Оценка после" value={move.evaluationAfterLabel} />
          <DetailRow label="Ход" value={move.san} />
        </div>

        <DetailRow label="Координаты" value={moveCoordinates} />

        <div className="border-border bg-surface-subtle rounded-[22px] border px-4 py-4">
          <p className="text-foreground text-sm font-semibold">
            Реплей синхронизирован, а AI-выводов для этого хода нет
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Доска показывает позицию после выбранного ply, а подробные
            рекомендации появляются только для отмеченных критических моментов.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
