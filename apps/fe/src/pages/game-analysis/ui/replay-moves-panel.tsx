import { useEffect, useRef } from "react";

import { cn } from "@/shared/lib/cn";
import { Typography } from "@/shared/ui";

import type {
  GameAnalysisCriticalMomentViewModel,
  GameAnalysisReplayMoveViewModel,
  SemanticTone,
} from "../model";

type ReplayMovesPanelProps = {
  criticalMoments: GameAnalysisCriticalMomentViewModel[];
  moves: GameAnalysisReplayMoveViewModel[];
  onSelectPly: (ply: number) => void;
  selectedPly: number | null;
};

type ReplayMoveRow = {
  blackMove: GameAnalysisReplayMoveViewModel | null;
  fullMoveNumber: number;
  whiteMove: GameAnalysisReplayMoveViewModel | null;
};

function getSeverityIndicatorClassName(tone: SemanticTone): string {
  switch (tone) {
    case "danger":
      return "bg-danger";
    case "warning":
      return "bg-warning";
    case "success":
      return "bg-success";
    default:
      return "bg-muted-foreground";
  }
}

function buildReplayRows(
  moves: GameAnalysisReplayMoveViewModel[],
): ReplayMoveRow[] {
  const rows: ReplayMoveRow[] = [];

  for (const move of moves) {
    const currentRow = rows.at(-1);

    if (!currentRow || currentRow.fullMoveNumber !== move.fullMoveNumber) {
      rows.push({
        fullMoveNumber: move.fullMoveNumber,
        whiteMove: move.moveColor === "white" ? move : null,
        blackMove: move.moveColor === "black" ? move : null,
      });
      continue;
    }

    if (move.moveColor === "white") {
      currentRow.whiteMove = move;
      continue;
    }

    currentRow.blackMove = move;
  }

  return rows;
}

function ReplayMoveButton(args: {
  criticalMoment: GameAnalysisCriticalMomentViewModel | null;
  isActive: boolean;
  move: GameAnalysisReplayMoveViewModel;
  onSelectPly: (ply: number) => void;
  registerRef: (element: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      className={cn(
        "hover:bg-surface-subtle flex h-9 w-full items-center justify-between rounded-md px-2 text-left text-sm transition-colors",
        args.isActive && "text-foreground bg-[#eef4fb]",
      )}
      onClick={() => args.onSelectPly(args.move.ply)}
      ref={args.registerRef}
      type="button"
    >
      <span className="min-w-0 truncate font-medium">{args.move.san}</span>
      {args.criticalMoment ? (
        <span
          className={cn(
            "ml-2 size-2 shrink-0 rounded-full",
            getSeverityIndicatorClassName(args.criticalMoment.severityTone),
          )}
          title={args.criticalMoment.severityLabel}
        />
      ) : null}
    </button>
  );
}

export function ReplayMovesPanel({
  criticalMoments,
  moves,
  onSelectPly,
  selectedPly,
}: ReplayMovesPanelProps) {
  const moveRefs = useRef(new Map<number, HTMLButtonElement>());
  const rows = buildReplayRows(moves);
  const selectedMove =
    moves.find((move) => move.ply === selectedPly) ?? moves[0] ?? null;

  useEffect(() => {
    if (selectedPly === null) {
      return;
    }

    moveRefs.current.get(selectedPly)?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [selectedPly]);

  return (
    <div className="min-h-0">
      <div className="mb-4 px-1">
        <h2 className="text-foreground text-lg font-semibold">Все ходы</h2>
        <Typography className="mt-1 text-sm">
          {selectedMove
            ? `${selectedMove.moveLabel} · ход ${selectedMove.ply} из ${moves.length}`
            : "Выберите ход, чтобы синхронизировать доску."}
        </Typography>
      </div>

      {moves.length === 0 ? (
          <div className="border-border bg-surface-subtle rounded-[22px] border px-4 py-5">
            <p className="text-foreground text-sm font-semibold">
              Реплей пока недоступен
            </p>
            <p className="text-muted-foreground mt-2 text-sm leading-6">
              Нормализованные ходы появятся здесь после готового анализа.
            </p>
          </div>
      ) : (
          <div className="divide-border overflow-hidden rounded-[18px] border divide-y">
            {rows.map((row) => {
              const whiteMove = row.whiteMove;
              const blackMove = row.blackMove;
              const whiteMoment = whiteMove
                ? (criticalMoments.find(
                    (moment) => moment.ply === whiteMove.ply,
                  ) ?? null)
                : null;
              const blackMoment = blackMove
                ? (criticalMoments.find(
                    (moment) => moment.ply === blackMove.ply,
                  ) ?? null)
                : null;

              return (
                <div
                  key={row.fullMoveNumber}
                  className="grid grid-cols-[2.75rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-1 px-2"
                >
                  <div className="text-muted-foreground px-1 text-xs font-semibold">
                    {row.fullMoveNumber}.
                  </div>

                  <div>
                    {whiteMove ? (
                      <ReplayMoveButton
                        criticalMoment={whiteMoment}
                        isActive={whiteMove.ply === selectedPly}
                        move={whiteMove}
                        onSelectPly={onSelectPly}
                        registerRef={(element) => {
                          const movePly = whiteMove.ply;

                          if (element) {
                            moveRefs.current.set(movePly, element);
                            return;
                          }

                          moveRefs.current.delete(movePly);
                        }}
                      />
                    ) : null}
                  </div>

                  <div>
                    {blackMove ? (
                      <ReplayMoveButton
                        criticalMoment={blackMoment}
                        isActive={blackMove.ply === selectedPly}
                        move={blackMove}
                        onSelectPly={onSelectPly}
                        registerRef={(element) => {
                          const movePly = blackMove.ply;

                          if (element) {
                            moveRefs.current.set(movePly, element);
                            return;
                          }

                          moveRefs.current.delete(movePly);
                        }}
                      />
                    ) : (
                      <div className="h-9" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
      )}
    </div>
  );
}
