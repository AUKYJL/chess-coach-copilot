import { Injectable } from '@nestjs/common';
import { StudentColor } from '../../generated/prisma/client.js';
import type { ExtractedAnnotationContext } from '../classification/annotation-extractor.service.js';
import { AnnotationExtractorService } from '../classification/annotation-extractor.service.js';
import { createPgnFingerprint } from './pgn-normalization.util.js';
import type { ParsedPgn } from './pgn-parser.service.js';
import { PgnParserService } from './pgn-parser.service.js';

export interface PreparedPgnForAnalysis {
  parsedPgn: ParsedPgn;
  extractedContext: ExtractedAnnotationContext;
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
  ) {}

  parseForAnalysis(
    rawPgn: string,
    studentColor: StudentColor,
  ): PreparedPgnForAnalysis {
    const parsedPgn = this.pgnParserService.parse(rawPgn, studentColor);
    const extractedContext = this.annotationExtractorService.extract(parsedPgn);

    return {
      parsedPgn,
      extractedContext,
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
