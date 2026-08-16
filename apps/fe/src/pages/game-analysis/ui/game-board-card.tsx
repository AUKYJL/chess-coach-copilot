import { ChevronLeft, ChevronRight, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";
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
const COMPACT_BOARD_SQUARE_SIZE_PX = 28;
const MOBILE_BOARD_SQUARE_SIZE_PX = 32;
const DESKTOP_BOARD_SQUARE_SIZE_PX = 39;
const MOBILE_VIEWPORT_MIN_WIDTH_PX = 360;
const DESKTOP_VIEWPORT_MIN_WIDTH_PX = 640;

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

function getBoardSizing(viewportWidth: number): BoardSizing {
  if (viewportWidth < MOBILE_VIEWPORT_MIN_WIDTH_PX) {
    return {
      squareSize: COMPACT_BOARD_SQUARE_SIZE_PX,
      boardSize: COMPACT_BOARD_SQUARE_SIZE_PX * 8,
      coordinateFontSize: 10,
      coordinateInset: 2,
    };
  }

  if (viewportWidth < DESKTOP_VIEWPORT_MIN_WIDTH_PX) {
    return {
      squareSize: MOBILE_BOARD_SQUARE_SIZE_PX,
      boardSize: MOBILE_BOARD_SQUARE_SIZE_PX * 8,
      coordinateFontSize: 10,
      coordinateInset: 3,
    };
  }

  return {
    squareSize: DESKTOP_BOARD_SQUARE_SIZE_PX,
    boardSize: DESKTOP_BOARD_SQUARE_SIZE_PX * 8,
    coordinateFontSize: 11,
    coordinateInset: 4,
  };
}

function getInitialBoardSizing(): BoardSizing {
  if (typeof window === "undefined") {
    return getBoardSizing(DESKTOP_VIEWPORT_MIN_WIDTH_PX);
  }

  return getBoardSizing(window.innerWidth);
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
  isNextDisabled: boolean;
  isPreviousDisabled: boolean;
  onFlipBoard: () => void;
  onGoToNext: () => void;
  onGoToPrevious: () => void;
  selectedMoment: GameAnalysisCriticalMomentViewModel | null;
  selectedMove: GameAnalysisReplayMoveViewModel | null;
};

export function GameBoardCard({
  boardReversed,
  initialFen,
  isNextDisabled,
  isPreviousDisabled,
  onFlipBoard,
  onGoToNext,
  onGoToPrevious,
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

  useEffect(() => {
    const desktopMediaQuery = window.matchMedia(
      `(min-width: ${DESKTOP_VIEWPORT_MIN_WIDTH_PX}px)`,
    );
    const mobileMediaQuery = window.matchMedia(
      `(min-width: ${MOBILE_VIEWPORT_MIN_WIDTH_PX}px)`,
    );

    const updateBoardSizing = () => {
      const nextBoardSizing = desktopMediaQuery.matches
        ? getBoardSizing(DESKTOP_VIEWPORT_MIN_WIDTH_PX)
        : mobileMediaQuery.matches
          ? getBoardSizing(MOBILE_VIEWPORT_MIN_WIDTH_PX)
          : getBoardSizing(0);

      setBoardSizing((currentBoardSizing) =>
        currentBoardSizing.squareSize === nextBoardSizing.squareSize
          ? currentBoardSizing
          : nextBoardSizing,
      );
    };

    updateBoardSizing();
    desktopMediaQuery.addEventListener("change", updateBoardSizing);
    mobileMediaQuery.addEventListener("change", updateBoardSizing);

    return () => {
      desktopMediaQuery.removeEventListener("change", updateBoardSizing);
      mobileMediaQuery.removeEventListener("change", updateBoardSizing);
    };
  }, []);

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
        <div className="mx-auto w-fit">
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
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            aria-label="Предыдущий ход"
            disabled={isPreviousDisabled}
            onClick={onGoToPrevious}
            size={BUTTON_SIZE.ICON}
            variant={BUTTON_VARIANT.OUTLINE}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            onClick={onFlipBoard}
            size={BUTTON_SIZE.SM}
            variant={BUTTON_VARIANT.GHOST}
          >
            <RefreshCcw className="size-4" />
            Перевернуть доску
          </Button>
          <Button
            aria-label="Следующий ход"
            disabled={isNextDisabled}
            onClick={onGoToNext}
            size={BUTTON_SIZE.ICON}
            variant={BUTTON_VARIANT.OUTLINE}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
