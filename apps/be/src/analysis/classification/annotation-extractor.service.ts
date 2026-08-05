import { Injectable } from '@nestjs/common';
import {
  AnnotationCoverage,
  MomentSeverity,
} from '../../generated/prisma/client.js';
import type { ParsedPgn } from '../preparation/pgn-parser.service.js';
import type {
  ParserDiagnostic,
  PositionEvaluation,
} from '../preparation/annotated-game.model.js';
import type { JsonObject } from '../../shared/types/json-value.type.js';

export interface ExtractedAnnotationMoment {
  ply: number;
  fullMoveNumber: number;
  moveNumber: string;
  moveColor: 'w' | 'b';
  san: string;
  lan: string | null;
  uci: string | null;
  beforeFen: string;
  afterFen: string;
  bestMove: string | null;
  bestVariation: string[];
  nags: string[];
  comments: string[];
  evaluationBefore: PositionEvaluation | null;
  evaluationAfter: PositionEvaluation | null;
  severity: MomentSeverity;
  sourceEvidence: JsonObject;
}

export interface ExtractedAnnotationContext {
  hasEngineAnnotations: boolean;
  annotationCoverage: AnnotationCoverage;
  reducedConfidenceWarning: string | null;
  moments: ExtractedAnnotationMoment[];
  rawCommentCount: number;
  candidateMomentCount: number;
  diagnostics: ParserDiagnostic[];
}

const REDUCED_CONFIDENCE_WARNING =
  'This PGN does not contain enough reliable annotated evidence for a high-confidence MVP analysis.';

const ERROR_NAG_TO_SEVERITY: Record<string, MomentSeverity> = {
  $2: MomentSeverity.MISTAKE,
  $4: MomentSeverity.BLUNDER,
  $6: MomentSeverity.INACCURACY,
};

@Injectable()
export class AnnotationExtractorService {
  extract(parsedPgn: ParsedPgn): ExtractedAnnotationContext {
    const candidateMoves = parsedPgn.moves.filter((move) =>
      move.nags.some((nag) => nag in ERROR_NAG_TO_SEVERITY),
    );
    const moments = candidateMoves
      .map((move) => this.toMoment(move))
      .filter((moment): moment is ExtractedAnnotationMoment => moment !== null);
    const hasStructuredEval = parsedPgn.moves.some(
      (move) => move.evaluationAfter !== null,
    );
    const hasEngineAnnotations = moments.length > 0 || hasStructuredEval;
    const annotationCoverage = this.getAnnotationCoverage(
      candidateMoves.length,
      moments.length,
    );

    return {
      hasEngineAnnotations,
      annotationCoverage,
      reducedConfidenceWarning:
        annotationCoverage === AnnotationCoverage.NONE
          ? REDUCED_CONFIDENCE_WARNING
          : null,
      moments,
      rawCommentCount: parsedPgn.moves.filter(
        (move) => move.comments.length > 0,
      ).length,
      candidateMomentCount: candidateMoves.length,
      diagnostics: parsedPgn.diagnostics,
    };
  }

  private toMoment(
    move: ParsedPgn['moves'][number],
  ): ExtractedAnnotationMoment | null {
    const severity = this.detectSeverity(move.nags);

    if (severity === MomentSeverity.UNKNOWN) {
      return null;
    }

    const hasReliableEvidence =
      move.bestVariation.length > 0 || move.evaluationAfter !== null;

    if (!hasReliableEvidence) {
      return null;
    }

    return {
      ply: move.ply,
      fullMoveNumber: move.fullMoveNumber,
      moveNumber: move.moveNumber,
      moveColor: move.color,
      san: move.san,
      lan: move.lan,
      uci: move.uci,
      beforeFen: move.beforeFen,
      afterFen: move.afterFen,
      bestMove: move.bestMove,
      bestVariation: move.bestVariation,
      nags: move.nags,
      comments: move.comments,
      evaluationBefore: move.evaluationBefore,
      evaluationAfter: move.evaluationAfter,
      severity,
      sourceEvidence: {
        ...move.sourceEvidence,
        rawComment: move.rawComment,
        comments: move.comments,
        bestVariationMoves: move.bestVariationMoves.map((variationMove) => ({
          moveNumber: variationMove.moveNumber,
          color: variationMove.color,
          san: variationMove.san,
        })),
      },
    };
  }

  private detectSeverity(nags: string[]): MomentSeverity {
    for (const nag of nags) {
      const severity = ERROR_NAG_TO_SEVERITY[nag];

      if (severity) {
        return severity;
      }
    }

    return MomentSeverity.UNKNOWN;
  }

  private getAnnotationCoverage(
    candidateCount: number,
    momentCount: number,
  ): AnnotationCoverage {
    if (candidateCount === 0) {
      return AnnotationCoverage.NONE;
    }

    if (momentCount === 0) {
      return AnnotationCoverage.NONE;
    }

    if (momentCount === candidateCount) {
      return AnnotationCoverage.FULL;
    }

    return AnnotationCoverage.PARTIAL;
  }
}
