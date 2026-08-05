import { PgnParserService } from './parsers/pgn-parser.service.js';
import { AnnotationExtractorService } from './services/annotation-extractor.service.js';
import { PgnPreparationService } from './pgn-preparation.service.js';

describe('PgnPreparationService', () => {
  const parser = new PgnParserService();
  const extractor = new AnnotationExtractorService();
  const service = new PgnPreparationService(parser, extractor);

  it('returns parsed PGN and extracted annotation context matching the legacy flow', () => {
    const rawPgn = `[Event "Test"]
[Result "1-0"]

1. e4 { [%eval 0.2] Good. } e5 { [%eval 0.1] } 2. Nf3 { [%eval 0.5] } Nc6 1-0`;

    const prepared = service.parseForAnalysis(rawPgn);
    const parsedPgn = parser.parse(rawPgn);
    const extractedContext = extractor.extract(parsedPgn);

    expect(prepared.parsedPgn).toEqual(parsedPgn);
    expect(prepared.extractedContext).toEqual(extractedContext);
  });
});
