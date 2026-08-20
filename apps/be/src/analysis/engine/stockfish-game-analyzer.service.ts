import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { Chess } from 'chess.js';
import type { StudentColor } from '../../generated/prisma/client.js';
import { stockfishConfig } from '../../config/index.js';
import type {
  EngineEvaluation,
  EngineEvidence,
  EnginePositionEvidence,
} from '../preparation/engine-evidence.model.js';
import type { ParsedPgn } from '../preparation/pgn-parser.service.js';
import { StockfishError } from './stockfish.error.js';
import { compareEngineEvaluations } from './stockfish-score.util.js';
import {
  StockfishUciAdapter,
  type StockfishPositionAnalysis,
} from './stockfish-uci.adapter.js';

type PositionReference = {
  ply: number;
  fen: string;
};

type Candidate = {
  before: PositionReference;
  after: PositionReference;
  beforeEvaluation: EngineEvaluation;
  afterEvaluation: EngineEvaluation;
};

@Injectable()
export class StockfishGameAnalyzerService {
  private queue = Promise.resolve();

  constructor(
    private readonly stockfishUciAdapter: StockfishUciAdapter,
    @Inject(stockfishConfig.KEY)
    private readonly configuration: ConfigType<typeof stockfishConfig>,
  ) {}

  analyze(
    parsedPgn: ParsedPgn,
    studentColor: StudentColor,
  ): Promise<EngineEvidence> {
    return this.enqueue(() => this.analyzeInternal(parsedPgn, studentColor));
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.queue.catch(() => undefined);
    let release: () => void;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });

    return previous.then(operation).finally(release!);
  }

  private async analyzeInternal(
    parsedPgn: ParsedPgn,
    studentColor: StudentColor,
  ): Promise<EngineEvidence> {
    const startedAt = Date.now();
    const positions = getGamePositions(parsedPgn);
    await this.stockfishUciAdapter.startNewGame();

    const scanByFen = await this.analyzeUniquePositions(
      positions,
      this.configuration.scanNodes,
      startedAt,
    );
    const candidates = selectCandidates(
      parsedPgn,
      studentColor,
      scanByFen,
      this.configuration.maxDeepMoves,
    );
    const deepPositions = candidates.flatMap((candidate) => [
      candidate.before,
      candidate.after,
    ]);
    const deepByFen = await this.analyzeUniquePositions(
      deepPositions,
      this.configuration.deepNodes,
      startedAt,
    );

    return {
      schemaVersion: 1,
      source: 'STOCKFISH',
      positions: positions.map((position) =>
        toEnginePositionEvidence(
          position,
          deepByFen.get(position.fen) ?? scanByFen.get(position.fen)!,
          deepByFen.has(position.fen) ? 'DEEP' : 'SCAN',
        ),
      ),
      engine: compactEngineIdentity(this.stockfishUciAdapter.getIdentity()),
      config: {
        binaryPath: this.configuration.binaryPath,
        threads: this.configuration.threads,
        hashMb: this.configuration.hashMb,
        multiPv: this.configuration.multiPv,
        scanNodes: this.configuration.scanNodes,
        deepNodes: this.configuration.deepNodes,
        maxDeepMoves: this.configuration.maxDeepMoves,
        positionHardTimeoutMs: this.configuration.positionHardTimeoutMs,
        gameHardTimeoutMs: this.configuration.gameHardTimeoutMs,
      },
    };
  }

  private async analyzeUniquePositions(
    positions: PositionReference[],
    nodes: number,
    startedAt: number,
  ): Promise<Map<string, StockfishPositionAnalysis>> {
    const analyses = new Map<string, StockfishPositionAnalysis>();

    for (const position of positions) {
      if (analyses.has(position.fen)) {
        continue;
      }

      const remainingMs =
        this.configuration.gameHardTimeoutMs - (Date.now() - startedAt);
      if (remainingMs <= 0) {
        throw new StockfishError(
          'HARD_TIMEOUT',
          `Stockfish game analysis exceeded ${this.configuration.gameHardTimeoutMs}ms`,
        );
      }

      analyses.set(
        position.fen,
        await this.stockfishUciAdapter.analyzePosition(
          position.fen,
          nodes,
          Math.min(this.configuration.positionHardTimeoutMs, remainingMs),
        ),
      );
    }

    return analyses;
  }
}

function getGamePositions(parsedPgn: ParsedPgn): PositionReference[] {
  const firstMove = parsedPgn.moves[0];
  if (!firstMove) {
    throw new StockfishError(
      'INVALID_ANALYSIS_REQUEST',
      'Stockfish game analysis requires at least one mainline move',
    );
  }

  return [
    { ply: 0, fen: firstMove.beforeFen },
    ...parsedPgn.moves.map((move) => ({ ply: move.ply, fen: move.afterFen })),
  ];
}

function selectCandidates(
  parsedPgn: ParsedPgn,
  studentColor: StudentColor,
  scanByFen: Map<string, StockfishPositionAnalysis>,
  maxDeepMoves: number,
): Candidate[] {
  const studentMoveColor = studentColor === 'WHITE' ? 'w' : 'b';

  return parsedPgn.moves
    .filter((move) => move.color === studentMoveColor)
    .map((move) => {
      const before = { ply: move.ply - 1, fen: move.beforeFen };
      const after = { ply: move.ply, fen: move.afterFen };
      const beforeEvaluation = scanByFen.get(before.fen)!.evaluation;
      const afterEvaluation = scanByFen.get(after.fen)!.evaluation;

      return { before, after, beforeEvaluation, afterEvaluation };
    })
    .filter((candidate) => isStudentDeterioration(candidate, studentColor))
    .sort((left, right) => compareCandidates(left, right, studentColor))
    .slice(0, maxDeepMoves);
}

function isStudentDeterioration(
  candidate: Candidate,
  studentColor: StudentColor,
): boolean {
  const comparison = compareEngineEvaluations(
    candidate.beforeEvaluation,
    candidate.afterEvaluation,
  );

  return studentColor === 'WHITE' ? comparison > 0 : comparison < 0;
}

function compareCandidates(
  left: Candidate,
  right: Candidate,
  studentColor: StudentColor,
): number {
  const leftMateRank = getMateDeteriorationRank(left, studentColor);
  const rightMateRank = getMateDeteriorationRank(right, studentColor);

  if (leftMateRank !== rightMateRank) {
    return rightMateRank - leftMateRank;
  }

  if (leftMateRank > 0) {
    return compareMateDeteriorations(left, right, studentColor);
  }

  return (
    getCentipawnLoss(right, studentColor) - getCentipawnLoss(left, studentColor)
  );
}

function getMateDeteriorationRank(
  candidate: Candidate,
  studentColor: StudentColor,
): number {
  if (isStudentLosingMate(candidate.afterEvaluation, studentColor)) {
    return 3;
  }

  if (isStudentWinningMate(candidate.beforeEvaluation, studentColor)) {
    return 2;
  }

  const hasMate =
    candidate.beforeEvaluation.type === 'mate' ||
    candidate.afterEvaluation.type === 'mate';

  return hasMate ? 1 : 0;
}

function compareMateDeteriorations(
  left: Candidate,
  right: Candidate,
  studentColor: StudentColor,
): number {
  const afterComparison = compareEngineEvaluations(
    left.afterEvaluation,
    right.afterEvaluation,
  );

  if (afterComparison !== 0) {
    return studentColor === 'WHITE' ? afterComparison : -afterComparison;
  }

  const beforeComparison = compareEngineEvaluations(
    right.beforeEvaluation,
    left.beforeEvaluation,
  );

  return studentColor === 'WHITE' ? beforeComparison : -beforeComparison;
}

function getCentipawnLoss(
  candidate: Candidate,
  studentColor: StudentColor,
): number {
  return studentColor === 'WHITE'
    ? candidate.beforeEvaluation.value - candidate.afterEvaluation.value
    : candidate.afterEvaluation.value - candidate.beforeEvaluation.value;
}

function isStudentLosingMate(
  evaluation: EngineEvaluation,
  studentColor: StudentColor,
): boolean {
  return (
    evaluation.type === 'mate' &&
    (studentColor === 'WHITE' ? evaluation.value < 0 : evaluation.value > 0)
  );
}

function isStudentWinningMate(
  evaluation: EngineEvaluation,
  studentColor: StudentColor,
): boolean {
  return (
    evaluation.type === 'mate' &&
    (studentColor === 'WHITE' ? evaluation.value > 0 : evaluation.value < 0)
  );
}

function toEnginePositionEvidence(
  position: PositionReference,
  analysis: StockfishPositionAnalysis,
  analysisLevel: 'SCAN' | 'DEEP',
): EnginePositionEvidence {
  const notation = toSanNotation(position.fen, analysis);

  return {
    ply: position.ply,
    fen: position.fen,
    evaluation: analysis.evaluation,
    ...(notation.bestMove ? { bestMove: notation.bestMove } : {}),
    ...(notation.principalVariation
      ? { principalVariation: notation.principalVariation }
      : {}),
    ...(analysis.depth !== null ? { depth: analysis.depth } : {}),
    ...(analysis.nodes !== null ? { nodes: analysis.nodes } : {}),
    analysisLevel,
  };
}

function toSanNotation(
  fen: string,
  analysis: StockfishPositionAnalysis,
): {
  bestMove: string | null;
  principalVariation: string[] | null;
} {
  try {
    return {
      bestMove: analysis.bestMove
        ? toSanMove(new Chess(fen), analysis.bestMove)
        : null,
      principalVariation: toSanVariation(fen, analysis.principalVariation),
    };
  } catch {
    return { bestMove: null, principalVariation: null };
  }
}

function toSanVariation(fen: string, moves: string[]): string[] | null {
  if (moves.length === 0) {
    return null;
  }

  const chess = new Chess(fen);
  const sanMoves: string[] = [];

  for (const move of moves) {
    const san = toSanMove(chess, move);

    if (!san) {
      return null;
    }

    sanMoves.push(san);
  }

  return sanMoves;
}

function toSanMove(chess: Chess, move: string): string | null {
  const match = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/.exec(move);

  if (!match) {
    return null;
  }

  try {
    return chess.move({
      from: match[1],
      to: match[2],
      ...(match[3] ? { promotion: match[3] } : {}),
    }).san;
  } catch {
    return null;
  }
}

function compactEngineIdentity(identity: {
  name: string | null;
  version: string | null;
}): EngineEvidence['engine'] {
  if (!identity.name && !identity.version) {
    return undefined;
  }

  return {
    ...(identity.name ? { name: identity.name } : {}),
    ...(identity.version ? { version: identity.version } : {}),
  };
}
