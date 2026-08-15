import type { AnalysisDetailsResponse, GameDetailsResponse } from "./api-types";
import type {
  GameAnalysisCriticalMomentViewModel,
  GameAnalysisHeaderViewModel,
  GameAnalysisPageViewModel,
  GameAnalysisReplayMoveViewModel,
  GameAnalysisSummaryStatViewModel,
  SemanticTone,
} from "./view-model";

type PositionEvaluation =
  | {
      kind: "centipawns";
      value: number;
    }
  | {
      kind: "mate";
      moves: number;
    };

type GameAnalysisJobStatus = NonNullable<
  GameDetailsResponse["latestAnalysisJobStatus"]
>;

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(new Date(dateString));
}

function formatStudentColor(
  studentColor: GameDetailsResponse["studentColor"],
): string {
  return studentColor === "WHITE"
    ? "Ученик играет белыми"
    : "Ученик играет черными";
}

function formatResult(game: GameDetailsResponse): string {
  if (game.rawResult) {
    return game.rawResult;
  }

  switch (game.derivedResult) {
    case "WIN":
      return "Победа";
    case "LOSS":
      return "Поражение";
    case "DRAW":
      return "Ничья";
    default:
      return "Результат неизвестен";
  }
}

function formatStatusLabel(
  status:
    GameAnalysisJobStatus | GameDetailsResponse["latestAnalysisJobStatus"],
  progressPercent?: number | null,
): string {
  const baseLabel = (() => {
    switch (status) {
      case "PENDING":
        return "Ожидание";
      case "PARSING":
        return "Читаем партию";
      case "EXTRACTING_ANNOTATIONS":
        return "Ищем ключевые позиции";
      case "CLASSIFICATION":
        return "Определяем паттерны";
      case "GENERATING_OUTPUT":
        return "Готовим рекомендации";
      case "FAILED":
        return "Анализ не удался";
      case "COMPLETED":
        return "Анализ готов";
      default:
        return "Анализ недоступен";
    }
  })();

  if (
    progressPercent !== undefined &&
    progressPercent !== null &&
    status !== "FAILED" &&
    status !== "COMPLETED"
  ) {
    return `${baseLabel} · ${progressPercent}%`;
  }

  return baseLabel;
}

function formatPlayersLabel(game: GameDetailsResponse): string {
  const whiteName = game.whitePlayerName?.trim() || "White";
  const blackName = game.blackPlayerName?.trim() || "Black";

  return `${whiteName} vs ${blackName}`;
}

function formatOpeningLabel(game: GameDetailsResponse): string | null {
  const parts = [game.openingHeader, game.ecoCode].filter(
    (value): value is string => Boolean(value),
  );

  return parts.length > 0 ? parts.join(" • ") : null;
}

function formatAnnotationCoverageLabel(
  annotationCoverage: AnalysisDetailsResponse["annotationCoverage"],
): string {
  switch (annotationCoverage) {
    case "FULL":
      return "Полные аннотации";
    case "PARTIAL":
      return "Частичные аннотации";
    default:
      return "Без аннотаций";
  }
}

function formatConfidenceLabel(
  confidenceLevel: AnalysisDetailsResponse["confidenceLevel"],
): string {
  switch (confidenceLevel) {
    case "HIGH":
      return "Высокая уверенность";
    case "MEDIUM":
      return "Средняя уверенность";
    default:
      return "Низкая уверенность";
  }
}

function formatSeverityLabel(
  severity: AnalysisDetailsResponse["criticalMoments"][number]["severity"],
): string {
  switch (severity) {
    case "BLUNDER":
      return "Зевок";
    case "MISTAKE":
      return "Ошибка";
    case "INACCURACY":
      return "Неточность";
    case "MATE":
      return "Матовая угроза";
    default:
      return "Ключевой момент";
  }
}

function formatSeverityTone(
  severity: AnalysisDetailsResponse["criticalMoments"][number]["severity"],
): SemanticTone {
  switch (severity) {
    case "BLUNDER":
    case "MATE":
      return "danger";
    case "MISTAKE":
      return "warning";
    case "INACCURACY":
      return "neutral";
    default:
      return "neutral";
  }
}

function parseEvaluation(
  evaluation: Record<string, unknown> | null,
): PositionEvaluation | null {
  if (!evaluation) {
    return null;
  }

  if (
    evaluation.kind === "centipawns" &&
    typeof evaluation.value === "number" &&
    Number.isFinite(evaluation.value)
  ) {
    return {
      kind: "centipawns",
      value: evaluation.value,
    };
  }

  if (
    evaluation.kind === "mate" &&
    typeof evaluation.moves === "number" &&
    Number.isFinite(evaluation.moves)
  ) {
    return {
      kind: "mate",
      moves: evaluation.moves,
    };
  }

  return null;
}

function formatEvaluationValue(
  evaluation: PositionEvaluation | null,
): string | null {
  if (!evaluation) {
    return null;
  }

  if (evaluation.kind === "centipawns") {
    const value = evaluation.value / 100;

    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
  }

  return `${evaluation.moves >= 0 ? "#" : "#-"}${Math.abs(evaluation.moves)}`;
}

function formatEvaluationSwing(
  evaluationBefore: PositionEvaluation | null,
  evaluationAfter: PositionEvaluation | null,
): string | null {
  if (
    !evaluationBefore ||
    !evaluationAfter ||
    evaluationBefore.kind !== "centipawns" ||
    evaluationAfter.kind !== "centipawns"
  ) {
    return null;
  }

  const swing = (evaluationAfter.value - evaluationBefore.value) / 100;

  return `${swing >= 0 ? "+" : ""}${swing.toFixed(1)}`;
}

function humanizeCategory(category: string | null): string | null {
  if (!category) {
    return null;
  }

  const normalized = category.replaceAll(/[_-]+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  const firstCharacter = normalized.charAt(0);

  return firstCharacter
    ? firstCharacter.toUpperCase() + normalized.slice(1)
    : null;
}

function parseBestMoveArrow(
  bestMove: string | null,
): { from: string; to: string } | null {
  if (!bestMove) {
    return null;
  }

  const match = bestMove.match(/^([a-h][1-8])([a-h][1-8])[nbrq]?$/i);

  if (!match) {
    return null;
  }

  const from = match[1]?.toLowerCase();
  const to = match[2]?.toLowerCase();

  if (!from || !to) {
    return null;
  }

  return {
    from,
    to,
  };
}

function createSummaryStats(
  criticalMoments: AnalysisDetailsResponse["criticalMoments"],
): GameAnalysisSummaryStatViewModel[] {
  const counts = criticalMoments.reduce(
    (accumulator, moment) => {
      if (moment.severity === "BLUNDER") {
        accumulator.blunders += 1;
      } else if (moment.severity === "MISTAKE") {
        accumulator.mistakes += 1;
      } else if (moment.severity === "INACCURACY") {
        accumulator.inaccuracies += 1;
      }

      return accumulator;
    },
    {
      blunders: 0,
      inaccuracies: 0,
      mistakes: 0,
    },
  );

  const stats: GameAnalysisSummaryStatViewModel[] = [
    {
      count: counts.blunders,
      label: "Зевки",
      tone: "danger",
    },
    {
      count: counts.mistakes,
      label: "Ошибки",
      tone: "warning",
    },
    {
      count: counts.inaccuracies,
      label: "Неточности",
      tone: "neutral",
    },
  ];

  return stats.filter((stat) => stat.count > 0);
}

function mapReplayMove(
  move: AnalysisDetailsResponse["replay"]["moves"][number],
): GameAnalysisReplayMoveViewModel {
  const evaluationBefore = parseEvaluation(move.evaluationBefore);
  const evaluationAfter = parseEvaluation(move.evaluationAfter);

  return {
    ply: move.ply,
    fullMoveNumber: move.fullMoveNumber,
    moveNumber: move.moveNumber,
    moveColor: move.moveColor === "BLACK" ? "black" : "white",
    san: move.san,
    moveLabel: `${move.moveNumber} ${move.san}`.trim(),
    beforeFen: move.beforeFen,
    afterFen: move.afterFen,
    actualMove:
      move.from && move.to
        ? {
            from: move.from,
            to: move.to,
          }
        : null,
    evaluationBeforeLabel: formatEvaluationValue(evaluationBefore),
    evaluationAfterLabel: formatEvaluationValue(evaluationAfter),
  };
}

function mapCriticalMoment(
  moment: AnalysisDetailsResponse["criticalMoments"][number],
): GameAnalysisCriticalMomentViewModel {
  const evaluationBefore = parseEvaluation(moment.evaluationBefore);
  const evaluationAfter = parseEvaluation(moment.evaluationAfter);
  const category = humanizeCategory(moment.mistake?.category ?? null);
  const summary = moment.comments[0] ?? category;

  return {
    id: moment.id,
    mistakeId: moment.mistake?.id ?? null,
    ply: moment.ply,
    moveLabel: `${moment.moveNumber} ${moment.san}`.trim(),
    severityLabel: formatSeverityLabel(moment.severity),
    severityTone: formatSeverityTone(moment.severity),
    category,
    coachNote: moment.mistake?.coachNote ?? "",
    reviewStatus: moment.mistake?.reviewStatus ?? "UNREVIEWED",
    summary,
    beforeFen: moment.beforeFen,
    afterFen: moment.afterFen,
    actualMove:
      moment.from && moment.to
        ? {
            from: moment.from,
            to: moment.to,
          }
        : null,
    bestMove: moment.bestMove,
    bestMoveArrow: parseBestMoveArrow(moment.bestMove),
    bestLine:
      moment.bestVariation.length > 0 ? moment.bestVariation.join(" ") : null,
    comments: moment.comments,
    evaluationBeforeLabel: formatEvaluationValue(evaluationBefore),
    evaluationAfterLabel: formatEvaluationValue(evaluationAfter),
    evaluationSwingLabel: formatEvaluationSwing(
      evaluationBefore,
      evaluationAfter,
    ),
    explanation: moment.mistake?.explanation ?? summary,
    suggestedFix: moment.mistake?.suggestedFix ?? null,
  };
}

export function mapGameAnalysisHeader(args: {
  game: GameDetailsResponse;
  statusLabel: string;
  statusTone: SemanticTone;
}): GameAnalysisHeaderViewModel {
  const openingLabel = formatOpeningLabel(args.game);
  const metadata = [
    formatStudentColor(args.game.studentColor),
    formatResult(args.game),
    openingLabel,
    formatDate(args.game.importedAt),
  ].filter((value): value is string => Boolean(value));

  return {
    breadcrumbs: ["Ученики", "Разбор партии"],
    title: formatPlayersLabel(args.game),
    metadata,
    statusLabel: args.statusLabel,
    statusTone: args.statusTone,
  };
}

export function mapGameAnalysisPage(args: {
  analysis: AnalysisDetailsResponse;
  game: GameDetailsResponse;
}): GameAnalysisPageViewModel {
  return {
    header: mapGameAnalysisHeader({
      game: args.game,
      statusLabel: formatStatusLabel("COMPLETED"),
      statusTone: "success",
    }),
    orientation: args.game.studentColor === "BLACK" ? "black" : "white",
    replay: {
      initialFen: args.analysis.replay.initialFen,
      moveCount: args.analysis.replay.moveCount,
      moves: args.analysis.replay.moves.map(mapReplayMove),
    },
    criticalMoments: args.analysis.criticalMoments.map(mapCriticalMoment),
    summary: {
      openingName: args.analysis.openingName,
      overallDiagnosis: args.analysis.overallDiagnosis,
      recommendedLessonTitle: args.analysis.recommendedLessonTitle,
      recommendedLessonWhy: args.analysis.recommendedLessonWhy,
      recommendedFocusPoints: args.analysis.recommendedFocusPoints,
      reducedConfidenceWarning: args.analysis.reducedConfidenceWarning,
      confidenceLabel: formatConfidenceLabel(args.analysis.confidenceLevel),
      annotationCoverageLabel: formatAnnotationCoverageLabel(
        args.analysis.annotationCoverage,
      ),
      stats: createSummaryStats(args.analysis.criticalMoments),
    },
  };
}

export function mapProcessingStatusLabel(
  game: GameDetailsResponse,
  progressPercent?: number | null,
): string {
  return formatStatusLabel(
    game.latestAnalysisJobStatus,
    progressPercent ?? null,
  );
}
