import { Button, BUTTON_SIZE, BUTTON_VARIANT } from "@/shared/ui/button";

import type { GameAnalysisCriticalMomentViewModel } from "../model";

import { ToneBadge } from "./tone-badge";

type SelectedCriticalMovePanelProps = {
  moment: GameAnalysisCriticalMomentViewModel;
  onOpenDetails: () => void;
};

export function SelectedCriticalMovePanel({
  moment,
  onOpenDetails,
}: SelectedCriticalMovePanelProps) {
  return (
    <div className="flex items-center justify-between gap-4">
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
        </div>
        <p className="text-muted-foreground text-sm">
          {moment.evaluationBeforeLabel ?? "—"} → {moment.evaluationAfterLabel ?? "—"}
          {moment.evaluationSwingLabel
            ? ` · Потеря оценки: ${moment.evaluationSwingLabel}`
            : ""}
        </p>
      </div>
      <Button
        className="shrink-0"
        onClick={onOpenDetails}
        size={BUTTON_SIZE.SM}
        type="button"
        variant={BUTTON_VARIANT.OUTLINE}
      >
        Открыть разбор
      </Button>
    </div>
  );
}
