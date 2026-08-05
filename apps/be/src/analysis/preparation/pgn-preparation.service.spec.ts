import { readFileSync } from 'fs';
import { StudentColor } from '../../generated/prisma/client.js';
import { AnnotationExtractorService } from '../classification/annotation-extractor.service.js';
import { PgnParserService } from './pgn-parser.service.js';
import { PgnPreparationService } from './pgn-preparation.service.js';

describe('PgnPreparationService', () => {
  const parser = new PgnParserService();
  const extractor = new AnnotationExtractorService();
  const service = new PgnPreparationService(parser, extractor);

  it('returns parsed PGN and extracted context for the fixture', () => {
    const rawPgn = readFileSync(
      new URL(
        '../../test/fixtures/pgn/annotated-lichess-with-eval.pgn',
        import.meta.url,
      ),
      'utf8',
    );

    const prepared = service.parseForAnalysis(rawPgn, StudentColor.BLACK);
    const parsedPgn = parser.parse(rawPgn, StudentColor.BLACK);
    const extractedContext = extractor.extract(parsedPgn);

    expect(prepared.parsedPgn).toEqual(parsedPgn);
    expect(prepared.extractedContext).toEqual(extractedContext);
  });
});
