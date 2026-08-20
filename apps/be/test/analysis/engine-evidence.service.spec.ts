import { readFileSync } from 'fs';
import { StudentColor } from '../../src/generated/prisma/client.js';
import { PgnParserService } from '../../src/analysis/preparation/pgn-parser.service.js';
import {
  inspectEngineEvidence,
  normalizeAnnotatedPgnEvidence,
  overlayEngineEvidence,
} from '../../src/analysis/preparation/engine-evidence.service.js';

function readFixture(name: string) {
  return readFileSync(
    new URL(`../fixtures/pgn/${name}`, import.meta.url),
    'utf8',
  );
}

describe('engine evidence foundation', () => {
  const parser = new PgnParserService();

  it('accepts fully evaluated games with mistakes', () => {
    const parsed = parser.parse(
      readFixture('annotated-lichess-with-eval.pgn'),
      StudentColor.BLACK,
    );

    expect(inspectEngineEvidence(parsed)).toMatchObject({
      sufficient: true,
      coveredStudentMoveCount: 26,
      analyzedStudentMoveCount: 26,
    });
  });

  it('accepts a clean fully evaluated game without NAGs', () => {
    const parsed = parser.parse(
      '[Result "1-0"]\n\n1. e4 { [%eval 0.2] } e5 { [%eval 0.1] } 2. Nf3 { [%eval 0.3] } Nc6 { [%eval 0.2] } 1-0',
      StudentColor.WHITE,
    );

    expect(inspectEngineEvidence(parsed).sufficient).toBe(true);
  });

  it('does not assume an evaluation for a custom initial position', () => {
    const parsed = parser.parse(
      '[SetUp "1"]\n[FEN "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"]\n[Result "1-0"]\n\n1. e4 { [%eval 0.2] } e5 1-0',
      StudentColor.WHITE,
    );

    expect(inspectEngineEvidence(parsed)).toMatchObject({
      sufficient: false,
      missing: [expect.objectContaining({ ply: 0, role: 'before' })],
    });
  });

  it('rejects candidate-only, comments-only, partial, and malformed evidence', () => {
    const candidateOnly = parser.parse(
      '[Result "1-0"]\n\n1. e4 e5 2. Nf3 { [%eval 0.3] } Nc6 1-0',
      StudentColor.WHITE,
    );
    const commentsOnly = parser.parse(
      '[Result "1-0"]\n\n1. e4 { Good move } e5 1-0',
      StudentColor.WHITE,
    );
    const partial = parser.parse(
      '[Result "1-0"]\n\n1. e4 { [%eval 0.2] } e5 2. Nf3 1-0',
      StudentColor.WHITE,
    );
    const malformed = parser.parse(
      '[Result "1-0"]\n\n1. e4 { [%eval nope] } e5 1-0',
      StudentColor.WHITE,
    );

    expect(inspectEngineEvidence(candidateOnly).sufficient).toBe(false);
    expect(inspectEngineEvidence(commentsOnly).sufficient).toBe(false);
    expect(inspectEngineEvidence(partial).sufficient).toBe(false);
    expect(inspectEngineEvidence(malformed).sufficient).toBe(false);
  });

  it('normalizes canonical centipawn and mate evaluations', () => {
    const parsed = parser.parse(
      '[Result "1-0"]\n\n1. e4 { [%eval 0.25] } e5 { [%eval #-3] } 1-0',
      StudentColor.WHITE,
    );
    const evidence = normalizeAnnotatedPgnEvidence(parsed);

    expect(evidence.source).toBe('PGN');
    expect(evidence.positions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ply: 0,
          evaluation: { type: 'cp', value: 0 },
        }),
        expect.objectContaining({
          ply: 1,
          evaluation: { type: 'cp', value: 25 },
        }),
        expect.objectContaining({
          ply: 2,
          evaluation: { type: 'mate', value: -3 },
        }),
      ]),
    );
  });

  it('overlays persisted evidence onto parsed mainline moves', () => {
    const parsed = parser.parse(
      '[Result "1-0"]\n\n1. e4 e5 1-0',
      StudentColor.WHITE,
    );
    const evidence = {
      schemaVersion: 1 as const,
      source: 'STOCKFISH' as const,
      positions: [
        {
          ply: 0,
          fen: parsed.moves[0].beforeFen,
          evaluation: { type: 'cp' as const, value: 42 },
        },
        {
          ply: 1,
          fen: parsed.moves[0].afterFen,
          evaluation: { type: 'cp' as const, value: 17 },
          bestMove: 'e2e4',
          principalVariation: ['e2e4', 'e7e5'],
        },
      ],
    };

    const overlaid = overlayEngineEvidence(parsed, evidence);

    expect(overlaid.moves[0]).toMatchObject({
      evaluationBefore: { kind: 'centipawns', value: 42 },
      evaluationAfter: { kind: 'centipawns', value: 17 },
      bestMove: 'e2e4',
      bestVariation: ['e2e4', 'e7e5'],
    });
  });
});
