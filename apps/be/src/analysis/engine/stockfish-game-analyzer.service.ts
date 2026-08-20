import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
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
    .filter(
      (candidate) =>
        compareEngineEvaluations(
          candidate.beforeEvaluation,
          candidate.afterEvaluation,
        ) > 0,
    )
    .sort(compareCandidates)
    .slice(0, maxDeepMoves);
}

function compareCandidates(left: Candidate, right: Candidate): number {
  const afterComparison = compareEngineEvaluations(
    left.afterEvaluation,
    right.afterEvaluation,
  );

  if (afterComparison !== 0) {
    return afterComparison;
  }

  return compareEngineEvaluations(
    right.beforeEvaluation,
    left.beforeEvaluation,
  );
}

function toEnginePositionEvidence(
  position: PositionReference,
  analysis: StockfishPositionAnalysis,
  analysisLevel: 'SCAN' | 'DEEP',
): EnginePositionEvidence {
  return {
    ply: position.ply,
    fen: position.fen,
    evaluation: analysis.evaluation,
    ...(analysis.bestMove ? { bestMove: analysis.bestMove } : {}),
    ...(analysis.principalVariation.length > 0
      ? { principalVariation: analysis.principalVariation }
      : {}),
    ...(analysis.depth !== null ? { depth: analysis.depth } : {}),
    ...(analysis.nodes !== null ? { nodes: analysis.nodes } : {}),
    analysisLevel,
  };
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
