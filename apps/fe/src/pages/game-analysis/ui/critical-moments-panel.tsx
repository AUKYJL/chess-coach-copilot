import { Separator, Typography } from "@/shared/ui";

import type { GameAnalysisCriticalMomentViewModel } from "../model";

import { ToneBadge } from "./tone-badge";

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
  return (
    <div className="border-border bg-surface rounded-[28px] border p-4 md:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-foreground text-lg font-semibold">
            Критические моменты
          </h2>
          <Typography className="mt-1 text-sm">
            {moments.length} {moments.length === 1 ? "эпизод" : "эпизода"}
          </Typography>
        </div>
      </div>

      {moments.length === 0 ? (
        <div className="border-border bg-surface-subtle rounded-[22px] border px-4 py-5">
          <p className="text-foreground text-sm font-semibold">
            Критические моменты не найдены
          </p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Анализ завершился без выделенных ошибок. Это не означает идеальную
            игру, только отсутствие отмеченных ключевых эпизодов.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {moments.map((moment, index) => {
            const isActive = moment.ply === selectedPly;

            return (
              <div key={moment.id} className="space-y-3">
                <button
                  className={[
                    "w-full rounded-[24px] border px-4 py-4 text-left transition-colors",
                    isActive
                      ? "border-accent/35 bg-[#eef4fb]"
                      : "border-border bg-surface-subtle hover:bg-surface",
                  ].join(" ")}
                  onClick={() => onSelectPly(moment.ply)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-foreground text-sm font-semibold">
                        {moment.moveLabel}
                      </p>
                      {moment.summary ? (
                        <p className="text-muted-foreground text-sm leading-6">
                          {moment.summary}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2 text-xs">
                        {moment.evaluationBeforeLabel ? (
                          <span className="text-muted-foreground">
                            До: {moment.evaluationBeforeLabel}
                          </span>
                        ) : null}
                        {moment.evaluationAfterLabel ? (
                          <span className="text-muted-foreground">
                            После: {moment.evaluationAfterLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <ToneBadge
                      label={moment.severityLabel}
                      tone={moment.severityTone}
                    />
                  </div>
                </button>

                {index < moments.length - 1 ? <Separator /> : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
