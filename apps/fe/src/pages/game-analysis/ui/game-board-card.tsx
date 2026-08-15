import { RefreshCcw } from "lucide-react";
import { ChessBoard, JSChessEngine, type SquarePos } from "react-chessboard-ui";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  TYPOGRAPHY_COLOR,
  TYPOGRAPHY_VARIANT,
  Typography,
} from "@/shared/ui";
import { BUTTON_SIZE, BUTTON_VARIANT, Button } from "@/shared/ui/button";

import type {
  GameAnalysisCriticalMomentViewModel,
  GameAnalysisReplayMoveViewModel,
} from "../model";

import { ToneBadge } from "./tone-badge";

const BOARD_CONFIG = {
  arrowColor: "#1f4d7a",
  darkSquareClassName: "bg-[#c9b6a5]",
  lightSquareClassName: "bg-[#f4efe7]",
  pieceSizePercent: 88,
  showMovesTrail: false,
  squareSize: 42,
  squareHighlightClassName: "shadow-[inset_0_0_0_3px_rgba(31,77,122,0.18)]",
};

type BoardArrow = {
  color: string;
  end: number[];
  start: number[];
};

function noop() {}

function squareToPosition(square: string): SquarePos | null {
  if (!/^[a-h][1-8]$/i.test(square)) {
    return null;
  }

  const file = square.toLowerCase().charCodeAt(0) - 97;
  const rank = Number(square[1]);

  return [file, 8 - rank];
}

function toArrowCoords(args: {
  color: string;
  move: { from: string; to: string } | null;
  reversed: boolean;
}): BoardArrow | null {
  if (!args.move) {
    return null;
  }

  const from = squareToPosition(args.move.from);
  const to = squareToPosition(args.move.to);

  if (!from || !to) {
    return null;
  }

  const [start, end] = args.reversed
    ? JSChessEngine.reverseMoveVector([from, to])
    : [from, to];

  return {
    start,
    end,
    color: args.color,
  };
}

type GameBoardCardProps = {
  boardReversed: boolean;
  initialFen: string;
  onFlipBoard: () => void;
  onPositionModeChange: (mode: "after" | "before") => void;
  positionMode: "after" | "before";
  selectedMoment: GameAnalysisCriticalMomentViewModel | null;
  selectedMove: GameAnalysisReplayMoveViewModel | null;
};

export function GameBoardCard({
  boardReversed,
  initialFen,
  onFlipBoard,
  onPositionModeChange,
  positionMode,
  selectedMoment,
  selectedMove,
}: GameBoardCardProps) {
  const fen = selectedMove
    ? positionMode === "before"
      ? selectedMove.beforeFen
      : selectedMove.afterFen
    : initialFen;
  const actualArrow = toArrowCoords({
    move: selectedMove?.actualMove ?? null,
    reversed: boardReversed,
    color: "#dc4c3e",
  });
  const bestArrow = toArrowCoords({
    move: selectedMoment?.bestMoveArrow ?? null,
    reversed: boardReversed,
    color: "#1f7a5c",
  });
  const arrows = [actualArrow, bestArrow].filter(
    (arrow): arrow is BoardArrow => arrow !== null,
  );

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <CardTitle>
              {selectedMove?.moveLabel ?? "Начальная позиция"}
            </CardTitle>
            {selectedMoment ? (
              <div className="flex flex-wrap items-center gap-2">
                <ToneBadge
                  label={selectedMoment.severityLabel}
                  tone={selectedMoment.severityTone}
                />
                {selectedMoment.category ? (
                  <ToneBadge label={selectedMoment.category} tone="neutral" />
                ) : null}
              </div>
            ) : selectedMove ? (
              <Typography
                color={TYPOGRAPHY_COLOR.SECONDARY}
                variant={TYPOGRAPHY_VARIANT.BODY_SMALL}
              >
                Обычный ход без выделенного критического момента.
              </Typography>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <div className="min-w-[336px]">
            <ChessBoard
              FEN={fen}
              arrows={arrows}
              config={BOARD_CONFIG}
              onChange={noop}
              onEndGame={noop}
              reversed={boardReversed}
              toggleTurn={false}
              viewOnly
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => onPositionModeChange("before")}
            size={BUTTON_SIZE.SM}
            variant={
              positionMode === "before"
                ? BUTTON_VARIANT.DEFAULT
                : BUTTON_VARIANT.OUTLINE
            }
          >
            До хода
          </Button>
          <Button
            onClick={() => onPositionModeChange("after")}
            size={BUTTON_SIZE.SM}
            variant={
              positionMode === "after"
                ? BUTTON_VARIANT.DEFAULT
                : BUTTON_VARIANT.OUTLINE
            }
          >
            После хода
          </Button>
          <Button
            onClick={onFlipBoard}
            size={BUTTON_SIZE.SM}
            variant={BUTTON_VARIANT.GHOST}
          >
            <RefreshCcw className="size-4" />
            Перевернуть доску
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
