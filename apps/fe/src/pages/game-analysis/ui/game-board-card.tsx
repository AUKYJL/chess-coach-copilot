import {
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChessBoard, JSChessEngine, type SquarePos } from "react-chessboard-ui";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";
import { BUTTON_SIZE, BUTTON_VARIANT, Button } from "@/shared/ui/button";

import type {
  GameAnalysisCriticalMomentViewModel,
  GameAnalysisReplayMoveViewModel,
} from "../model";

const BOARD_CONFIG = {
  arrowColor: "#1f4d7a",
  darkSquareClassName: "bg-[#c9b6a5]",
  lightSquareClassName: "bg-[#f4efe7]",
  pieceSizePercent: 88,
  showMovesTrail: false,
  squareHighlightClassName: "shadow-[inset_0_0_0_3px_rgba(31,77,122,0.18)]",
};
const BOARD_DARK_SQUARE_COLOR = "#C9B6A5";
const BOARD_COORDINATE_FILES = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
] as const;
const BOARD_COORDINATE_RANKS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
] as const;
const BOARD_LIGHT_SQUARE_COLOR = "#F4EFE7";
const BOARD_MAX_SIZE_PX = 640;
const MIN_BOARD_SQUARE_SIZE_PX = 28;
const SELECTED_MOVE_ROW_HEIGHT_PX = 26;

type BoardSizing = {
  boardSize: number;
  coordinateFontSize: number;
  coordinateInset: number;
  squareSize: number;
};

type BoardArrow = {
  color: string;
  end: number[];
  start: number[];
};

function noop() {}

function getBoardSizing(availableWidth: number): BoardSizing {
  const squareSize = Math.max(
    MIN_BOARD_SQUARE_SIZE_PX,
    Math.floor(Math.min(availableWidth, BOARD_MAX_SIZE_PX) / 8),
  );

  return {
    squareSize,
    boardSize: squareSize * 8,
    coordinateFontSize: squareSize < 36 ? 10 : 11,
    coordinateInset: squareSize < 36 ? 3 : 4,
  };
}

function getInitialBoardSizing(): BoardSizing {
  return getBoardSizing(320);
}

function getCoordinateTextColor(rowIndex: number, columnIndex: number): string {
  const isLightSquare = (rowIndex + columnIndex) % 2 === 0;

  return isLightSquare ? BOARD_DARK_SQUARE_COLOR : BOARD_LIGHT_SQUARE_COLOR;
}

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
  isEndDisabled: boolean;
  isNextDisabled: boolean;
  isPreviousDisabled: boolean;
  isStartDisabled: boolean;
  onFlipBoard: () => void;
  onGoToEnd: () => void;
  onGoToNext: () => void;
  onGoToPrevious: () => void;
  onGoToStart: () => void;
  selectedMoment: GameAnalysisCriticalMomentViewModel | null;
  selectedMove: GameAnalysisReplayMoveViewModel | null;
};

export function GameBoardCard({
  boardReversed,
  initialFen,
  isEndDisabled,
  isNextDisabled,
  isPreviousDisabled,
  isStartDisabled,
  onFlipBoard,
  onGoToEnd,
  onGoToNext,
  onGoToPrevious,
  onGoToStart,
  selectedMoment,
  selectedMove,
}: GameBoardCardProps) {
  const fen = selectedMove ? selectedMove.afterFen : initialFen;
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
  const displayedFiles = boardReversed
    ? BOARD_COORDINATE_FILES.toReversed()
    : BOARD_COORDINATE_FILES;
  const displayedRanks = boardReversed
    ? BOARD_COORDINATE_RANKS
    : BOARD_COORDINATE_RANKS.toReversed();
  const [boardSizing, setBoardSizing] = useState(getInitialBoardSizing);
  const boardContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateBoardSizing = () => {
      const availableWidth = boardContainerRef.current?.clientWidth;

      if (!availableWidth) {
        return;
      }

      const nextBoardSizing = getBoardSizing(availableWidth);

      setBoardSizing((currentBoardSizing) =>
        currentBoardSizing.squareSize === nextBoardSizing.squareSize
          ? currentBoardSizing
          : nextBoardSizing,
      );
    };

    updateBoardSizing();
    const resizeObserver = new ResizeObserver(updateBoardSizing);
    const boardContainer = boardContainerRef.current;

    if (boardContainer) {
      resizeObserver.observe(boardContainer);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <Card>
      <CardHeader className="gap-1 pb-3">
        <div
          className="flex items-center"
          style={{ minHeight: SELECTED_MOVE_ROW_HEIGHT_PX }}
        >
          <CardTitle className="text-base">
            {selectedMove
              ? `${selectedMove.moveLabel} · ход ${selectedMove.ply}`
              : "Начальная позиция"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div ref={boardContainerRef} className="mx-auto w-full">
          <div
            className="relative mx-auto"
            style={{
              height: boardSizing.boardSize,
              width: boardSizing.boardSize,
            }}
          >
            <div style={{ width: boardSizing.boardSize }}>
              <ChessBoard
                FEN={fen}
                arrows={arrows}
                key={boardSizing.squareSize}
                config={{
                  ...BOARD_CONFIG,
                  squareSize: boardSizing.squareSize,
                }}
                onChange={noop}
                onEndGame={noop}
                reversed={boardReversed}
                toggleTurn={false}
                viewOnly
              />
            </div>
            <div
              className="pointer-events-none absolute inset-0 grid"
              style={{
                gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
                gridTemplateRows: "repeat(8, minmax(0, 1fr))",
              }}
            >
              {Array.from({ length: 64 }, (_, index) => {
                const rowIndex = Math.floor(index / 8);
                const columnIndex = index % 8;
                const file =
                  rowIndex === 7 ? displayedFiles[columnIndex] : null;
                const rank =
                  columnIndex === 7 ? displayedRanks[rowIndex] : null;

                return (
                  <div key={`${rowIndex}-${columnIndex}`} className="relative">
                    {file ? (
                      <span
                        className="absolute leading-none font-medium"
                        style={{
                          bottom: boardSizing.coordinateInset,
                          color: getCoordinateTextColor(rowIndex, columnIndex),
                          fontSize: boardSizing.coordinateFontSize,
                          left: boardSizing.coordinateInset,
                        }}
                      >
                        {file}
                      </span>
                    ) : null}
                    {rank ? (
                      <span
                        className="absolute leading-none font-medium"
                        style={{
                          color: getCoordinateTextColor(rowIndex, columnIndex),
                          fontSize: boardSizing.coordinateFontSize,
                          right: boardSizing.coordinateInset,
                          top: boardSizing.coordinateInset,
                        }}
                      >
                        {rank}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1">
          <Button
            aria-label="Начало партии"
            className="size-8 rounded-xl p-1.5"
            disabled={isStartDisabled}
            onClick={onGoToStart}
            size={BUTTON_SIZE.ICON}
            variant={BUTTON_VARIANT.OUTLINE}
          >
            <ChevronsLeft className="size-4" />
          </Button>
          <Button
            aria-label="Предыдущий ход"
            className="size-8 rounded-xl p-1.5"
            disabled={isPreviousDisabled}
            onClick={onGoToPrevious}
            size={BUTTON_SIZE.ICON}
            variant={BUTTON_VARIANT.OUTLINE}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-muted-foreground text-sm font-medium">
            {selectedMove?.moveLabel ?? "Начало"}
          </span>
          <Button
            aria-label="Следующий ход"
            className="size-8 rounded-xl p-1.5"
            disabled={isNextDisabled}
            onClick={onGoToNext}
            size={BUTTON_SIZE.ICON}
            variant={BUTTON_VARIANT.OUTLINE}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button
            aria-label="Конец партии"
            className="size-8 rounded-xl p-1.5"
            disabled={isEndDisabled}
            onClick={onGoToEnd}
            size={BUTTON_SIZE.ICON}
            variant={BUTTON_VARIANT.OUTLINE}
          >
            <ChevronsRight className="size-4" />
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
