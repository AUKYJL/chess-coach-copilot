import {
  compareEngineEvaluations,
  normalizeUciScore,
} from './stockfish-score.util.js';

describe('stockfish score utilities', () => {
  it('normalizes UCI cp and mate scores to White perspective', () => {
    expect(normalizeUciScore('cp', 42, 'w')).toEqual({ type: 'cp', value: 42 });
    expect(normalizeUciScore('cp', 42, 'b')).toEqual({
      type: 'cp',
      value: -42,
    });
    expect(normalizeUciScore('mate', -3, 'b')).toEqual({
      type: 'mate',
      value: 3,
    });
  });

  it('orders mate scores without converting them to centipawns', () => {
    expect(
      compareEngineEvaluations(
        { type: 'mate', value: 2 },
        { type: 'mate', value: 5 },
      ),
    ).toBeGreaterThan(0);
    expect(
      compareEngineEvaluations(
        { type: 'mate', value: -5 },
        { type: 'mate', value: -2 },
      ),
    ).toBeGreaterThan(0);
    expect(
      compareEngineEvaluations(
        { type: 'mate', value: 1 },
        { type: 'cp', value: 10_000 },
      ),
    ).toBeGreaterThan(0);
  });
});
