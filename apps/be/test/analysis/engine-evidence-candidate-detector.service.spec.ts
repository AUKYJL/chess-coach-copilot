import {
  MomentSeverity,
  StudentColor,
} from '../../src/generated/prisma/client.js';
import type { EngineEvidence } from '../../src/analysis/preparation/engine-evidence.model.js';
import { PgnParserService } from '../../src/analysis/preparation/pgn-parser.service.js';
import { EngineEvidenceCandidateDetectorService } from '../../src/analysis/classification/engine-evidence-candidate-detector.service.js';

describe('EngineEvidenceCandidateDetectorService', () => {
  const detector = new EngineEvidenceCandidateDetectorService();

  it('uses student-white centipawn loss thresholds without NAGs', () => {
    const parsed = parse(StudentColor.WHITE);
    const context = detector.detect(
      parsed,
      evidence(parsed, 'PGN', [0, -60, -60, -60]),
    );

    expect(context.moments).toMatchObject([
      { ply: 1, severity: MomentSeverity.INACCURACY },
    ]);
  });

  it('reverses deterioration for a black student', () => {
    const parsed = parse(StudentColor.BLACK);
    const context = detector.detect(
      parsed,
      evidence(parsed, 'PGN', [0, 0, 110, 110]),
    );

    expect(context.moments).toMatchObject([
      { ply: 2, severity: MomentSeverity.MISTAKE },
    ]);
  });

  it('classifies worsening mate evaluations as MATE', () => {
    const parsed = parse(StudentColor.WHITE);
    const positions = parsed.moves;
    const context = detector.detect(parsed, {
      schemaVersion: 1,
      source: 'PGN',
      positions: [
        {
          ply: 0,
          fen: positions[0].beforeFen,
          evaluation: { type: 'cp', value: 20 },
        },
        {
          ply: 1,
          fen: positions[0].afterFen,
          evaluation: { type: 'mate', value: -2 },
        },
      ],
    });

    expect(context.moments).toMatchObject([
      { ply: 1, severity: MomentSeverity.MATE },
    ]);
  });

  it('uses only deep Stockfish position pairs and preserves deep before PV', () => {
    const parsed = parse(StudentColor.WHITE);
    const context = detector.detect(
      parsed,
      evidence(parsed, 'STOCKFISH', [0, -250, -250, -250], 'DEEP'),
    );

    expect(context.moments).toMatchObject([
      {
        ply: 1,
        severity: MomentSeverity.BLUNDER,
        bestMove: 'e2e4',
        bestVariation: ['e2e4', 'e7e5'],
      },
    ]);
  });

  it('does not turn scan-only Stockfish evidence into product moments', () => {
    const parsed = parse(StudentColor.WHITE);

    expect(
      detector.detect(
        parsed,
        evidence(parsed, 'STOCKFISH', [0, -250, -250, -250], 'SCAN'),
      ).moments,
    ).toEqual([]);
  });
});

function parse(studentColor: StudentColor) {
  return new PgnParserService().parse(
    '[Event "Test"]\n[Result "*"]\n\n1. e4 e5 2. Nf3 Nc6 *',
    studentColor,
  );
}

function evidence(
  parsed: ReturnType<typeof parse>,
  source: EngineEvidence['source'],
  values: number[],
  analysisLevel?: 'SCAN' | 'DEEP',
): EngineEvidence {
  const positions = [
    { ply: 0, fen: parsed.moves[0].beforeFen },
    ...parsed.moves.map((move) => ({ ply: move.ply, fen: move.afterFen })),
  ];

  return {
    schemaVersion: 1,
    source,
    positions: positions.map((position, index) => ({
      ...position,
      evaluation: { type: 'cp' as const, value: values[index] },
      ...(analysisLevel ? { analysisLevel } : {}),
      ...(position.ply === 0
        ? { bestMove: 'e2e4', principalVariation: ['e2e4', 'e7e5'] }
        : {}),
    })),
  };
}
