import { Injectable } from '@nestjs/common';
import {
  AnnotationCoverage,
  MomentSeverity,
} from '../../generated/prisma/client.js';
import type { JsonObject } from '../../shared/types/json-value.type.js';
import { compareEngineEvaluations } from '../engine/stockfish-score.util.js';
import type { EngineEvidence } from '../preparation/engine-evidence.model.js';
import type { ParsedPgn } from '../preparation/pgn-parser.service.js';
import type {
  ExtractedAnnotationContext,
  ExtractedAnnotationMoment,
} from './annotation-extractor.service.js';

const INACCURACY_THRESHOLD_CP = 50;
const MISTAKE_THRESHOLD_CP = 100;
const BLUNDER_THRESHOLD_CP = 200;

@Injectable()
export class EngineEvidenceCandidateDetectorService {
  detect(
    parsedPgn: ParsedPgn,
    evidence: EngineEvidence,
  ): ExtractedAnnotationContext {
    const positions = new Map(
      evidence.positions.map((position) => [
        positionKey(position.ply, position.fen),
        position,
      ]),
    );
    const moments = parsedPgn.moves
      .filter((move) => move.color === toMoveColor(parsedPgn.studentColor))
      .flatMap((move) => {
        const before = positions.get(positionKey(move.ply - 1, move.beforeFen));
        const after = positions.get(positionKey(move.ply, move.afterFen));

        if (!before || !after || !isUsablePair(evidence, before, after)) {
          return [];
        }

        const severity = detectSeverity(
          before.evaluation,
          after.evaluation,
          parsedPgn.studentColor,
        );

        if (!severity) {
          return [];
        }

        const sourceEvidence: JsonObject = {
          ...move.sourceEvidence,
          engineEvidenceSource: evidence.source,
          analysisLevel: before.analysisLevel ?? null,
          evaluationBefore: before.evaluation,
          evaluationAfter: after.evaluation,
        };

        return [
          {
            ply: move.ply,
            fullMoveNumber: move.fullMoveNumber,
            moveNumber: move.moveNumber,
            moveColor: move.color,
            san: move.san,
            lan: move.lan,
            uci: move.uci,
            beforeFen: move.beforeFen,
            afterFen: move.afterFen,
            bestMove: before.bestMove ?? move.bestMove,
            bestVariation: before.principalVariation ?? move.bestVariation,
            nags: move.nags,
            comments: move.comments,
            evaluationBefore: toPositionEvaluation(before.evaluation),
            evaluationAfter: toPositionEvaluation(after.evaluation),
            severity,
            sourceEvidence,
          } satisfies Omit<ExtractedAnnotationMoment, 'momentId'>,
        ];
      })
      .map((moment, index) => ({ ...moment, momentId: `moment-${index + 1}` }));

    return {
      hasEngineAnnotations: true,
      annotationCoverage: AnnotationCoverage.FULL,
      reducedConfidenceWarning: null,
      moments,
      rawCommentCount: parsedPgn.moves.filter(
        (move) => move.comments.length > 0,
      ).length,
      candidateMomentCount: moments.length,
      diagnostics: parsedPgn.diagnostics,
    };
  }
}

function isUsablePair(
  evidence: EngineEvidence,
  before: EngineEvidence['positions'][number],
  after: EngineEvidence['positions'][number],
): boolean {
  return (
    evidence.source === 'PGN' ||
    (before.analysisLevel === 'DEEP' && after.analysisLevel === 'DEEP')
  );
}

function detectSeverity(
  before: EngineEvidence['positions'][number]['evaluation'],
  after: EngineEvidence['positions'][number]['evaluation'],
  studentColor: ParsedPgn['studentColor'],
): MomentSeverity | null {
  const whiteComparison = compareEngineEvaluations(before, after);
  const deterioration =
    studentColor === 'WHITE' ? whiteComparison : -whiteComparison;

  if (deterioration <= 0) {
    return null;
  }

  if (before.type === 'mate' || after.type === 'mate') {
    return MomentSeverity.MATE;
  }

  const loss =
    studentColor === 'WHITE'
      ? before.value - after.value
      : after.value - before.value;

  if (loss >= BLUNDER_THRESHOLD_CP) {
    return MomentSeverity.BLUNDER;
  }
  if (loss >= MISTAKE_THRESHOLD_CP) {
    return MomentSeverity.MISTAKE;
  }
  return loss >= INACCURACY_THRESHOLD_CP ? MomentSeverity.INACCURACY : null;
}

function positionKey(ply: number, fen: string): string {
  return `${ply}:${fen}`;
}

function toMoveColor(studentColor: ParsedPgn['studentColor']): 'w' | 'b' {
  return studentColor === 'WHITE' ? 'w' : 'b';
}

function toPositionEvaluation(
  evaluation: EngineEvidence['positions'][number]['evaluation'],
) {
  return evaluation.type === 'cp'
    ? {
        kind: 'centipawns' as const,
        value: evaluation.value,
        raw: evaluation.value / 100,
      }
    : {
        kind: 'mate' as const,
        moves: evaluation.value,
        raw: `#${evaluation.value}`,
      };
}
