import { Injectable } from '@nestjs/common';
import {
  AnnotationCoverage,
  MomentSeverity,
} from '../../generated/prisma/client.js';
import type { ParsedPgn } from '../parsers/pgn-parser.service.js';

export interface ExtractedAnnotationMoment {
  moveNumber: string;
  movePlayed: string;
  bestMove: string | null;
  fen: string | null;
  evaluationBefore: string | null;
  evaluationAfter: string | null;
  evalChange: string | null;
  severity: MomentSeverity;
  mainTag: string;
  secondaryTags: string[];
  confidence: number;
  whatHappened: string;
  studentExplanation: string;
  coachNote: string;
  trainingTheme: string | null;
  sourceEvidence: Record<string, unknown>;
}

export interface ExtractedAnnotationContext {
  hasEngineAnnotations: boolean;
  annotationCoverage: AnnotationCoverage;
  reducedConfidenceWarning: string | null;
  moments: ExtractedAnnotationMoment[];
  rawCommentCount: number;
}

const REDUCED_CONFIDENCE_WARNING =
  'This PGN does not contain enough engine annotations for a high-confidence MVP analysis.';

@Injectable()
export class AnnotationExtractorService {
  extract(parsedPgn: ParsedPgn): ExtractedAnnotationContext {
    const hasEngineAnnotations = parsedPgn.comments.some((comment) =>
      comment.comment.includes('[%eval'),
    );
    console.log('parsedPgn');
    console.log(parsedPgn);
    console.log('hasEngineAnnotations');
    console.log(hasEngineAnnotations);

    const annotationCoverage = hasEngineAnnotations
      ? parsedPgn.comments.length >= 3
        ? AnnotationCoverage.FULL
        : AnnotationCoverage.PARTIAL
      : AnnotationCoverage.NONE;

    const moments = parsedPgn.comments.map((comment, index) => {
      const move = parsedPgn.moves[Math.min(index, parsedPgn.moves.length - 1)];
      const evalMatch = comment.comment.match(/\[%eval\s+([^\]]+)\]/);

      return {
        moveNumber: move?.moveNumber ?? `${index + 1}.`,
        movePlayed: move?.san ?? 'unknown',
        bestMove: null,
        fen: comment.fen,
        evaluationBefore: null,
        evaluationAfter: evalMatch?.[1] ?? null,
        evalChange: null,
        severity: this.detectSeverity(comment.comment),
        mainTag: hasEngineAnnotations
          ? 'engine-annotated-moment'
          : 'commented-moment',
        secondaryTags: hasEngineAnnotations
          ? ['annotated-pgn']
          : ['reduced-confidence'],
        confidence: hasEngineAnnotations ? 0.85 : 0.35,
        whatHappened: this.stripEvalMarkup(comment.comment),
        studentExplanation: this.stripEvalMarkup(comment.comment),
        coachNote: this.stripEvalMarkup(comment.comment),
        trainingTheme: hasEngineAnnotations ? 'conversion' : null,
        sourceEvidence: {
          comment: comment.comment,
          fen: comment.fen,
        },
      } satisfies ExtractedAnnotationMoment;
    });

    return {
      hasEngineAnnotations,
      annotationCoverage,
      reducedConfidenceWarning:
        annotationCoverage === AnnotationCoverage.NONE
          ? REDUCED_CONFIDENCE_WARNING
          : null,
      moments,
      rawCommentCount: parsedPgn.comments.length,
    };
  }

  private detectSeverity(comment: string): MomentSeverity {
    if (comment.includes('??')) {
      return MomentSeverity.BLUNDER;
    }

    if (comment.includes('?')) {
      return MomentSeverity.MISTAKE;
    }

    if (comment.includes('!')) {
      return MomentSeverity.INACCURACY;
    }

    return MomentSeverity.UNKNOWN;
  }

  private stripEvalMarkup(comment: string): string {
    return (
      comment.replace(/\[%eval[^\]]+\]/g, '').trim() || 'Annotated position'
    );
  }
}
