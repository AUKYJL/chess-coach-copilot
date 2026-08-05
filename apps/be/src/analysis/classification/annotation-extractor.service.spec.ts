import { readFileSync } from 'fs';
import {
  AnnotationCoverage,
  MomentSeverity,
  StudentColor,
} from '../../generated/prisma/client.js';
import { PgnParserService } from '../preparation/pgn-parser.service.js';
import { AnnotationExtractorService } from './annotation-extractor.service.js';

describe('AnnotationExtractorService', () => {
  const parser = new PgnParserService();
  const service = new AnnotationExtractorService();

  it('extracts factual moments from the eval fixture without duplicates', () => {
    const parsed = parser.parse(
      readFileSync(
        new URL(
          '../../../test/fixtures/pgn/annotated-lichess-with-eval.pgn',
          import.meta.url,
        ),
        'utf8',
      ),
      StudentColor.BLACK,
    );
    const result = service.extract(parsed);

    expect(result.hasEngineAnnotations).toBe(true);
    expect(result.annotationCoverage).toBe(AnnotationCoverage.FULL);
    expect(result.reducedConfidenceWarning).toBeNull();
    expect(result.moments).toHaveLength(12);
    expect(new Set(result.moments.map((moment) => moment.ply)).size).toBe(
      result.moments.length,
    );
    expect(
      result.moments.find((moment) => moment.moveNumber === '4.')
        ?.bestVariation,
    ).toContain('Nf3');
    expect(result.moments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          moveNumber: '4.',
          san: 'c3',
          severity: MomentSeverity.INACCURACY,
          bestMove: 'Nf3',
        }),
        expect.objectContaining({
          moveNumber: '11...',
          san: 'Bf5',
          severity: MomentSeverity.BLUNDER,
          bestMove: 'Bxf3',
        }),
        expect.objectContaining({
          moveNumber: '18...',
          san: 'a5',
          severity: MomentSeverity.MISTAKE,
          bestMove: 'Rxe1+',
        }),
        expect.objectContaining({
          moveNumber: '19.',
          san: 'Rxe8+',
          severity: MomentSeverity.INACCURACY,
          bestMove: 'Qb3+',
        }),
      ]),
    );
  });

  it('keeps PGN without eval at full coverage when NAG plus RAV are present', () => {
    const parsed = parser.parse(
      readFileSync(
        new URL(
          '../../../test/fixtures/pgn/annotated-lichess-without-eval.pgn',
          import.meta.url,
        ),
        'utf8',
      ),
      StudentColor.BLACK,
    );
    const result = service.extract(parsed);

    expect(result.hasEngineAnnotations).toBe(true);
    expect(result.annotationCoverage).toBe(AnnotationCoverage.FULL);
    expect(result.moments[0].evaluationAfter).toBeNull();
    expect(result.moments[0].comments).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Inaccuracy. Nf3 was best.'),
      ]),
    );
  });

  it('marks plain-comment games as no reliable evidence', () => {
    const parsed = parser.parse(
      `[Event "Test"]
[Result "1-0"]

1. e4 { Interesting idea. } e5 2. Nf3 Nc6 1-0`,
      StudentColor.WHITE,
    );
    const result = service.extract(parsed);

    expect(result.hasEngineAnnotations).toBe(false);
    expect(result.annotationCoverage).toBe(AnnotationCoverage.NONE);
    expect(result.moments).toHaveLength(0);
  });
});
