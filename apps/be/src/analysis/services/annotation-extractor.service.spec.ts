import { AnnotationCoverage } from '../../generated/prisma/client.js';
import { PgnParserService } from '../parsers/pgn-parser.service.js';
import { AnnotationExtractorService } from './annotation-extractor.service.js';

describe('AnnotationExtractorService', () => {
  const parser = new PgnParserService();
  const service = new AnnotationExtractorService();

  it('extracts engine-annotated context', () => {
    const parsed = parser.parse(`[Event "Test"]
[Result "1-0"]

1. e4 { [%eval 0.2] Good. } e5 { [%eval 0.1] } 2. Nf3 { [%eval 0.5] } Nc6 1-0`);
    const result = service.extract(parsed);

    expect(result.hasEngineAnnotations).toBe(true);
    expect(result.annotationCoverage).toBe(AnnotationCoverage.FULL);
    expect(result.reducedConfidenceWarning).toBeNull();
    expect(result.moments.length).toBeGreaterThan(0);
  });

  it('marks annotation-poor games as reduced confidence', () => {
    const parsed = parser.parse(`[Event "Test"]
[Result "1-0"]

1. e4 { Interesting idea. } e5 2. Nf3 Nc6 1-0`);
    const result = service.extract(parsed);

    expect(result.hasEngineAnnotations).toBe(false);
    expect(result.annotationCoverage).toBe(AnnotationCoverage.NONE);
    expect(result.reducedConfidenceWarning).toEqual(expect.any(String));
  });
});
