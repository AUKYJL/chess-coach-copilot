import { readFileSync } from 'fs';
import { StudentColor } from '../../generated/prisma/client.js';
import { PgnParserService } from './pgn-parser.service.js';

function readFixture(name: string) {
  return readFileSync(
    new URL(`../../../test/fixtures/pgn/${name}`, import.meta.url),
    'utf8',
  );
}

describe('PgnParserService', () => {
  const service = new PgnParserService();

  it('parses the annotated fixture with structured tags, warnings, and replay data', () => {
    const parsed = service.parse(
      readFixture('annotated-lichess-with-eval.pgn'),
      StudentColor.BLACK,
    );

    expect(parsed.headers.opening).toBe("Bishop's Opening: Warsaw Gambit");
    expect(parsed.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'unknown-tag-warning',
          key: 'GameId',
        }),
      ]),
    );
    expect(parsed.moves).toHaveLength(53);
    expect(parsed.moves[0].ply).toBe(1);
    expect(parsed.moves[0].moveNumber).toBe('1.');
    expect(parsed.moves[0].san).toBe('e4');
    expect(typeof parsed.moves[0].beforeFen).toBe('string');
    expect(typeof parsed.moves[0].afterFen).toBe('string');
    expect(parsed.moves[6]).toMatchObject({
      moveNumber: '4.',
      san: 'c3',
      nags: ['$6'],
      bestMove: 'Nf3',
      bestVariation: [
        'Nf3',
        'Bb4+',
        'c3',
        'dxc3',
        'bxc3',
        'd5',
        'exd5',
        'Be7',
        'O-O',
        'O-O',
      ],
      evaluationAfter: {
        kind: 'centipawns',
        value: -121,
        raw: -1.21,
      },
    });
    expect(parsed.moves[35]).toMatchObject({
      moveNumber: '18...',
      san: 'a5',
      nags: ['$2'],
      bestMove: 'Rxe1+',
      evaluationAfter: {
        kind: 'mate',
        moves: 6,
        raw: '#6',
      },
    });
  });

  it('parses the literate fixture without eval and keeps RAV plus comments', () => {
    const parsed = service.parse(
      readFixture('annotated-lichess-without-eval.pgn'),
      StudentColor.BLACK,
    );

    const move = parsed.moves.find(
      (item) => item.moveNumber === '4.' && item.san === 'c3',
    );

    expect(move).toMatchObject({
      nags: ['$6'],
      bestMove: 'Nf3',
      evaluationAfter: null,
    });
    expect(move?.comments).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Inaccuracy. Nf3 was best.'),
      ]),
    );
  });

  it('matches parseGame output with parse(..., startRule: game)', () => {
    const raw = readFixture('annotated-lichess-with-eval.pgn');

    const direct = service.parse(raw, StudentColor.BLACK);
    const viaStartRule = service.parseWithGenericGameRule(
      raw,
      StudentColor.BLACK,
    );

    expect(viaStartRule).toEqual(direct);
  });

  it('rejects invalid pgn input', () => {
    expect(() => service.parse('not a real pgn', StudentColor.WHITE)).toThrow(
      'Invalid PGN:',
    );
  });
});
