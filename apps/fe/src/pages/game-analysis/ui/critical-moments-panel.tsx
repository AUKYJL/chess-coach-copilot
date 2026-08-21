import { Typography } from "@/shared/ui";

import type { GameAnalysisCriticalMomentViewModel } from "../model";

import { ToneBadge } from "./tone-badge";

function getReviewStatusLabel(
  reviewStatus: GameAnalysisCriticalMomentViewModel["reviewStatus"],
): string {
  switch (reviewStatus) {
    case "CONFIRMED":
      return "Подтверждено";
    case "REJECTED":
      return "Отклонено";
    default:
      return "Не проверено";
  }
}

type CriticalMomentsPanelProps = {
  moments: GameAnalysisCriticalMomentViewModel[];
  onSelectPly: (ply: number) => void;
  selectedPly: number | null;
};

export function CriticalMomentsPanel({
  moments,
  onSelectPly,
  selectedPly,
}: CriticalMomentsPanelProps) {
  const reviewedCount = moments.filter(
    (moment) => moment.reviewStatus !== "UNREVIEWED",
  ).length;

  return (
    <div className="min-h-0">
      <div className="mb-4 flex items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-foreground text-lg font-semibold">
            Критические моменты
          </h2>
          <Typography className="mt-1 text-sm">
            {moments.length} эпизодов · {reviewedCount} проверено
          </Typography>
        </div>
      </div>

      {moments.length === 0 ? (
        <div className="border-border bg-surface-subtle rounded-[18px] border px-4 py-5">
          <p className="text-foreground text-sm font-semibold">
            Критические моменты не найдены
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Анализ завершился без выделенных ошибок. Это не означает идеальную
            игру, только отсутствие отмеченных ключевых эпизодов.
          </p>
        </div>
      ) : (
        <div className="divide-border overflow-hidden rounded-[20px] border divide-y">
          {moments.map((moment) => {
            const isActive = moment.ply === selectedPly;

            return (
              <button
                key={moment.id}
                className={[
                  "hover:bg-surface-subtle w-full px-4 py-3 text-left transition-colors",
                  isActive && "bg-[#eef4fb]",
                ].filter(Boolean).join(" ")}
                onClick={() => onSelectPly(moment.ply)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-foreground text-sm font-semibold">
                        {moment.moveLabel}
                      </p>
                      <ToneBadge
                        className="px-2 py-0.5 text-[11px]"
                        label={moment.severityLabel}
                        tone={moment.severityTone}
                      />
                      {moment.category ? (
                        <span className="text-muted-foreground text-xs">
                          {moment.category}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {moment.evaluationBeforeLabel ?? "—"} → {moment.evaluationAfterLabel ?? "—"}
                      {moment.evaluationSwingLabel
                        ? ` · ${moment.evaluationSwingLabel}`
                        : ""}
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0 pt-0.5 text-xs">
                    {getReviewStatusLabel(moment.reviewStatus)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
