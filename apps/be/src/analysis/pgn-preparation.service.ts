import { Injectable } from '@nestjs/common';
import { createPgnFingerprint } from './pgn-normalization.util.js';
import type { ParsedPgn } from './parsers/pgn-parser.service.js';
import { PgnParserService } from './parsers/pgn-parser.service.js';
import type { ExtractedAnnotationContext } from './services/annotation-extractor.service.js';
import { AnnotationExtractorService } from './services/annotation-extractor.service.js';

export interface PreparedPgnForAnalysis {
  parsedPgn: ParsedPgn;
  extractedContext: ExtractedAnnotationContext;
}

@Injectable()
export class PgnPreparationService {
  constructor(
    private readonly pgnParserService: PgnParserService,
    private readonly annotationExtractorService: AnnotationExtractorService,
  ) {}

  parseForAnalysis(rawPgn: string): PreparedPgnForAnalysis {
    const parsedPgn = this.pgnParserService.parse(rawPgn);
    const extractedContext = this.annotationExtractorService.extract(parsedPgn);

    return {
      parsedPgn,
      extractedContext,
    };
  }

  createFingerprint(rawPgn: string): string {
    return createPgnFingerprint(rawPgn);
  }
}
