import { StudentColor } from '../../generated/prisma/client.js';
import { Injectable } from '@nestjs/common';
import { createPgnFingerprint } from './pgn-normalization.util.js';
import type { ExtractedAnnotationContext } from '../classification/annotation-extractor.service.js';
import { AnnotationExtractorService } from '../classification/annotation-extractor.service.js';
import type { ParsedPgn } from './pgn-parser.service.js';
import { PgnParserService } from './pgn-parser.service.js';

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
}
