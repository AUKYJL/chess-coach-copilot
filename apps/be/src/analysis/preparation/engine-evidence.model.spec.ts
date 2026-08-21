import { engineEvidenceSchema } from './engine-evidence.model.js';

describe('engineEvidenceSchema', () => {
  it('accepts zero depth for a terminal Stockfish position', () => {
    expect(
      engineEvidenceSchema.parse({
        schemaVersion: 1,
        source: 'STOCKFISH',
        positions: [
          {
            ply: 7,
            fen: 'terminal-position',
            evaluation: { type: 'mate', value: 0 },
            depth: 0,
          },
        ],
      }),
    ).toMatchObject({ positions: [{ depth: 0 }] });
  });
});
