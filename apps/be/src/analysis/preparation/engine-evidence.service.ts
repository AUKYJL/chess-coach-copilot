import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import type {
  ParsedPgn,
  PositionEvaluation,
  PreparedMove,
} from './annotated-game.model.js';
import {
  ENGINE_EVIDENCE_SCHEMA_VERSION,
  engineEvidenceSchema,
  type EngineEvaluation,
  type EngineEvidence,
  type EngineEvidenceInspection,
  type EngineEvidenceMissingPosition,
  type EnginePositionEvidence,
} from './engine-evidence.model.js';

const STANDARD_INITIAL_FEN =
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

@Injectable()
export class EngineEvidenceService {
  inspect(parsedPgn: ParsedPgn): EngineEvidenceInspection {
    return inspectEngineEvidence(parsedPgn);
  }

  normalizeAnnotatedPgn(parsedPgn: ParsedPgn): EngineEvidence {
    return normalizeAnnotatedPgnEvidence(parsedPgn);
  }

  parsePersisted(value: Prisma.JsonValue): EngineEvidence {
    return engineEvidenceSchema.parse(value);
  }

  overlay(parsedPgn: ParsedPgn, evidence: EngineEvidence | null): ParsedPgn {
    return overlayEngineEvidence(parsedPgn, evidence);
  }
}

export function inspectEngineEvidence(
  parsedPgn: ParsedPgn,
): EngineEvidenceInspection {
  const evaluationsByPosition = createEvaluationMap(parsedPgn);
  const studentMoves = parsedPgn.moves.filter(
    (move) => move.color === toMoveColor(parsedPgn.studentColor),
  );
  const missing: EngineEvidenceMissingPosition[] = [];
  let coveredStudentMoveCount = 0;

  for (const move of studentMoves) {
    const before = evaluationsByPosition.get(
      positionKey(move.ply - 1, move.beforeFen),
    );
    const after = evaluationsByPosition.get(
      positionKey(move.ply, move.afterFen),
    );

    if (before !== undefined && after !== undefined) {
      coveredStudentMoveCount += 1;
      continue;
    }

    if (before === undefined) {
      missing.push({ ply: move.ply - 1, fen: move.beforeFen, role: 'before' });
    }
    if (after === undefined) {
      missing.push({ ply: move.ply, fen: move.afterFen, role: 'after' });
    }
  }

  return {
    sufficient: missing.length === 0,
    analyzedStudentMoveCount: studentMoves.length,
    coveredStudentMoveCount,
    missing,
  };
}

export function normalizeAnnotatedPgnEvidence(
  parsedPgn: ParsedPgn,
): EngineEvidence {
  const positions: EnginePositionEvidence[] = [];

  if (usesStandardInitialPosition(parsedPgn)) {
    positions.push({
      ply: 0,
      fen: STANDARD_INITIAL_FEN,
      evaluation: { type: 'cp', value: 0 },
    });
  }

  for (const move of parsedPgn.moves) {
    if (move.evaluationAfter === null) {
      continue;
    }

    positions.push({
      ply: move.ply,
      fen: move.afterFen,
      evaluation: toEngineEvaluation(move.evaluationAfter),
      ...(move.bestMove ? { bestMove: move.bestMove } : {}),
      ...(move.bestVariation.length > 0
        ? { principalVariation: move.bestVariation }
        : {}),
    });
  }

  return {
    schemaVersion: ENGINE_EVIDENCE_SCHEMA_VERSION,
    source: 'PGN',
    positions,
  };
}

export function overlayEngineEvidence(
  parsedPgn: ParsedPgn,
  evidence: EngineEvidence | null,
): ParsedPgn {
  if (!evidence) {
    return parsedPgn;
  }

  const positionsByKey = new Map(
    evidence.positions.map((position) => [
      positionKey(position.ply, position.fen),
      position,
    ]),
  );

  return {
    ...parsedPgn,
    moves: parsedPgn.moves.map((move) => overlayMove(move, positionsByKey)),
  };
}

function createEvaluationMap(parsedPgn: ParsedPgn) {
  const evaluations = new Map<string, EngineEvaluation>();

  if (usesStandardInitialPosition(parsedPgn)) {
    evaluations.set(positionKey(0, STANDARD_INITIAL_FEN), {
      type: 'cp',
      value: 0,
    });
  }

  for (const move of parsedPgn.moves) {
    if (move.evaluationAfter !== null) {
      evaluations.set(
        positionKey(move.ply, move.afterFen),
        toEngineEvaluation(move.evaluationAfter),
      );
    }
  }

  return evaluations;
}

function overlayMove(
  move: PreparedMove,
  positionsByKey: Map<string, EnginePositionEvidence>,
): PreparedMove {
  const before = positionsByKey.get(positionKey(move.ply - 1, move.beforeFen));
  const after = positionsByKey.get(positionKey(move.ply, move.afterFen));

  return {
    ...move,
    evaluationBefore: before
      ? toPositionEvaluation(before.evaluation)
      : move.evaluationBefore,
    evaluationAfter: after
      ? toPositionEvaluation(after.evaluation)
      : move.evaluationAfter,
    bestMove: after?.bestMove ?? move.bestMove,
    bestVariation: after?.principalVariation ?? move.bestVariation,
  };
}

function toMoveColor(studentColor: ParsedPgn['studentColor']): 'w' | 'b' {
  return studentColor === 'WHITE' ? 'w' : 'b';
}

function usesStandardInitialPosition(parsedPgn: ParsedPgn): boolean {
  return parsedPgn.headers.setUp !== '1';
}

function positionKey(ply: number, fen: string): string {
  return `${ply}:${fen}`;
}

function toEngineEvaluation(evaluation: PositionEvaluation): EngineEvaluation {
  return evaluation.kind === 'centipawns'
    ? { type: 'cp', value: evaluation.value }
    : { type: 'mate', value: evaluation.moves };
}

function toPositionEvaluation(
  evaluation: EngineEvaluation,
): PositionEvaluation {
  return evaluation.type === 'cp'
    ? {
        kind: 'centipawns',
        value: evaluation.value,
        raw: evaluation.value / 100,
      }
    : { kind: 'mate', moves: evaluation.value, raw: `#${evaluation.value}` };
}
