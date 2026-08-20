import { Injectable } from '@nestjs/common';
import { StudentColor } from '../../generated/prisma/client.js';
import type { ExtractedAnnotationContext } from '../classification/annotation-extractor.service.js';
import { AnnotationExtractorService } from '../classification/annotation-extractor.service.js';
import type {
  EngineEvidence,
  EngineEvidenceInspection,
} from './engine-evidence.model.js';
import { EngineEvidenceService } from './engine-evidence.service.js';
import { EngineEvidenceCandidateDetectorService } from '../classification/engine-evidence-candidate-detector.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { createPgnFingerprint } from './pgn-normalization.util.js';
import type { ParsedPgn } from './pgn-parser.service.js';
import { PgnParserService } from './pgn-parser.service.js';

export interface PreparedPgnForAnalysis {
  parsedPgn: ParsedPgn;
  extractedContext: ExtractedAnnotationContext;
  engineEvidenceInspection: EngineEvidenceInspection;
  engineEvidence: EngineEvidence | null;
}

export interface PersistedGameSummary {
  event: string | null;
  site: string | null;
  whitePlayerName: string | null;
  blackPlayerName: string | null;
  openingHeader: string | null;
  ecoCode: string | null;
  rawResult: string | null;
  derivedResult: ParsedPgn['result'];
  plyCount: number | null;
}

@Injectable()
export class PgnPreparationService {
  constructor(
    private readonly pgnParserService: PgnParserService,
    private readonly annotationExtractorService: AnnotationExtractorService,
    private readonly engineEvidenceService: EngineEvidenceService,
    private readonly engineEvidenceCandidateDetectorService: EngineEvidenceCandidateDetectorService,
  ) {}

  parseForAnalysis(
    rawPgn: string,
    studentColor: StudentColor,
  ): PreparedPgnForAnalysis {
    const parsedPgn = this.pgnParserService.parse(rawPgn, studentColor);
    const extractedContext = this.annotationExtractorService.extract(parsedPgn);
    const engineEvidenceInspection =
      this.engineEvidenceService.inspect(parsedPgn);

    return {
      parsedPgn,
      extractedContext,
      engineEvidenceInspection,
      engineEvidence: engineEvidenceInspection.sufficient
        ? this.engineEvidenceService.normalizeAnnotatedPgn(parsedPgn)
        : null,
    };
  }

  parsePersistedForAnalysis(
    rawPgn: string,
    studentColor: StudentColor,
    persistedEvidence: Prisma.JsonValue,
  ): PreparedPgnForAnalysis {
    const parsedPgn = this.pgnParserService.parse(rawPgn, studentColor);
    const engineEvidence =
      this.engineEvidenceService.parsePersisted(persistedEvidence);

    return {
      parsedPgn,
      extractedContext: this.engineEvidenceCandidateDetectorService.detect(
        parsedPgn,
        engineEvidence,
      ),
      engineEvidenceInspection: {
        sufficient: true,
        analyzedStudentMoveCount: parsedPgn.moves.filter(
          (move) => move.color === (studentColor === 'WHITE' ? 'w' : 'b'),
        ).length,
        coveredStudentMoveCount: parsedPgn.moves.filter(
          (move) => move.color === (studentColor === 'WHITE' ? 'w' : 'b'),
        ).length,
        missing: [],
      },
      engineEvidence,
    };
  }

  createFingerprint(rawPgn: string): string {
    return createPgnFingerprint(rawPgn);
  }

  buildGameSummary(parsedPgn: ParsedPgn): PersistedGameSummary {
    return {
      event: parsedPgn.headers.event,
      site: parsedPgn.headers.site,
      whitePlayerName: parsedPgn.headers.white,
      blackPlayerName: parsedPgn.headers.black,
      openingHeader: parsedPgn.headers.opening,
      ecoCode: parsedPgn.headers.eco,
      rawResult: parsedPgn.rawResult,
      derivedResult: parsedPgn.result,
      plyCount: parsedPgn.moves.length > 0 ? parsedPgn.moves.length : null,
    };
  }
}
