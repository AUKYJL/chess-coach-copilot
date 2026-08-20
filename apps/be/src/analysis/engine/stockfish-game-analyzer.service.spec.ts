import { StudentColor } from '../../generated/prisma/client.js';
import { PgnParserService } from '../preparation/pgn-parser.service.js';
import type { ParsedPgn } from '../preparation/pgn-parser.service.js';
import { StockfishGameAnalyzerService } from './stockfish-game-analyzer.service.js';
import type { StockfishPositionAnalysis } from './stockfish-uci.adapter.js';

const configuration = {
  binaryPath: '/test/stockfish',
  threads: 1,
  hashMb: 32,
  multiPv: 1,
  scanNodes: 100,
  deepNodes: 500,
  maxDeepMoves: 8,
  positionHardTimeoutMs: 1_000,
  gameHardTimeoutMs: 10_000,
};

describe('StockfishGameAnalyzerService', () => {
  it('scans every game position and deepens only deteriorating student moves', async () => {
    const adapter = new FakeStockfishAdapter({
      f0: { type: 'cp', value: 100 },
      f1: { type: 'cp', value: 0 },
      f2: { type: 'cp', value: 0 },
      f3: { type: 'cp', value: -200 },
    });
    const service = new StockfishGameAnalyzerService(
      adapter as never,
      configuration,
    );

    const evidence = await service.analyze(
      createParsedGame(),
      StudentColor.WHITE,
    );

    expect(adapter.startNewGameCalls).toBe(1);
    expect(adapter.calls.filter((call) => call.nodes === 100)).toHaveLength(4);
    expect(adapter.calls.filter((call) => call.nodes === 500)).toHaveLength(4);
    expect(evidence).toMatchObject({
      source: 'STOCKFISH',
      positions: [
        { ply: 0, fen: 'f0', nodes: 500 },
        { ply: 1, fen: 'f1', nodes: 500 },
        { ply: 2, fen: 'f2', nodes: 500 },
        { ply: 3, fen: 'f3', nodes: 500 },
      ],
      engine: { name: 'Stockfish', version: '17' },
      config: { scanNodes: 100, deepNodes: 500 },
    });
  });

  it('deduplicates repeated FENs during scan and deep passes', async () => {
    const adapter = new FakeStockfishAdapter({
      f0: { type: 'cp', value: 100 },
      f1: { type: 'cp', value: -100 },
    });
    const service = new StockfishGameAnalyzerService(
      adapter as never,
      configuration,
    );
    const parsedGame = createParsedGame();
    parsedGame.moves[1].afterFen = 'f1';
    parsedGame.moves[2].beforeFen = 'f1';
    parsedGame.moves[2].afterFen = 'f1';

    await service.analyze(parsedGame, StudentColor.WHITE);

    expect(adapter.calls.filter((call) => call.nodes === 100)).toHaveLength(2);
    expect(adapter.calls.filter((call) => call.nodes === 500)).toHaveLength(2);
  });

  it('deepens deteriorating moves made by a black student', async () => {
    const adapter = new FakeStockfishAdapter({
      f0: { type: 'cp', value: 0 },
      f1: { type: 'cp', value: -100 },
      f2: { type: 'cp', value: 100 },
      f3: { type: 'cp', value: 100 },
    });
    const service = new StockfishGameAnalyzerService(
      adapter as never,
      configuration,
    );

    await service.analyze(createParsedGame(), StudentColor.BLACK);

    expect(adapter.calls.filter((call) => call.nodes === 500)).toEqual([
      expect.objectContaining({ fen: 'f1' }),
      expect.objectContaining({ fen: 'f2' }),
    ]);
  });

  it('prioritizes the largest White centipawn loss for deep analysis', async () => {
    const adapter = new FakeStockfishAdapter({
      f0: { type: 'cp', value: 800 },
      f1: { type: 'cp', value: 500 },
      f2: { type: 'cp', value: 100 },
      f3: { type: 'cp', value: 90 },
    });
    const service = new StockfishGameAnalyzerService(adapter as never, {
      ...configuration,
      maxDeepMoves: 1,
    });

    await service.analyze(createParsedGame(), StudentColor.WHITE);

    expect(adapter.calls.filter((call) => call.nodes === 500)).toEqual([
      expect.objectContaining({ fen: 'f0' }),
      expect.objectContaining({ fen: 'f1' }),
    ]);
  });

  it('prioritizes the largest Black centipawn loss for deep analysis', async () => {
    const adapter = new FakeStockfishAdapter({
      f0: { type: 'cp', value: 0 },
      f1: { type: 'cp', value: -800 },
      f2: { type: 'cp', value: -500 },
      f3: { type: 'cp', value: -100 },
      f4: { type: 'cp', value: -90 },
    });
    const service = new StockfishGameAnalyzerService(adapter as never, {
      ...configuration,
      maxDeepMoves: 1,
    });

    await service.analyze(createFourPlyGame(), StudentColor.BLACK);

    expect(adapter.calls.filter((call) => call.nodes === 500)).toEqual([
      expect.objectContaining({ fen: 'f1' }),
      expect.objectContaining({ fen: 'f2' }),
    ]);
  });

  it('prioritizes a transition to a losing mate over centipawn losses', async () => {
    const adapter = new FakeStockfishAdapter({
      f0: { type: 'cp', value: 100 },
      f1: { type: 'mate', value: -3 },
      f2: { type: 'cp', value: 100 },
      f3: { type: 'cp', value: -200 },
    });
    const service = new StockfishGameAnalyzerService(adapter as never, {
      ...configuration,
      maxDeepMoves: 1,
    });

    await service.analyze(createParsedGame(), StudentColor.WHITE);

    expect(adapter.calls.filter((call) => call.nodes === 500)).toEqual([
      expect.objectContaining({ fen: 'f0' }),
      expect.objectContaining({ fen: 'f1' }),
    ]);
  });

  it('persists legal Stockfish notation as SAN and omits an invalid PV', async () => {
    const parsed = new PgnParserService().parse(
      '[Event "Test"]\n[Result "*"]\n\n1. e4 e5 *',
      StudentColor.WHITE,
    );
    const evaluations = Object.fromEntries([
      [parsed.moves[0].beforeFen, { type: 'cp' as const, value: 100 }],
      [parsed.moves[0].afterFen, { type: 'cp' as const, value: 0 }],
      [parsed.moves[1].afterFen, { type: 'cp' as const, value: 0 }],
    ]);
    const adapter = new FakeStockfishAdapter(evaluations, ['e2e4', 'invalid']);
    const service = new StockfishGameAnalyzerService(
      adapter as never,
      configuration,
    );

    const evidence = await service.analyze(parsed, StudentColor.WHITE);

    expect(evidence.positions[0]).toMatchObject({ bestMove: 'e4' });
    expect(evidence.positions[0]?.principalVariation).toBeUndefined();
  });
});

class FakeStockfishAdapter {
  readonly calls: Array<{ fen: string; nodes: number; timeoutMs: number }> = [];
  startNewGameCalls = 0;

  constructor(
    private readonly evaluations: Record<
      string,
      StockfishPositionAnalysis['evaluation']
    >,
    private readonly principalVariation = ['e2e4', 'e7e5'],
  ) {}

  startNewGame(): Promise<void> {
    this.startNewGameCalls += 1;
    return Promise.resolve();
  }

  analyzePosition(
    fen: string,
    nodes: number,
    timeoutMs: number,
  ): Promise<StockfishPositionAnalysis> {
    this.calls.push({ fen, nodes, timeoutMs });
    return Promise.resolve({
      evaluation: this.evaluations[fen],
      bestMove: 'e2e4',
      principalVariation: this.principalVariation,
      depth: 12,
      nodes,
    });
  }

  getIdentity() {
    return { name: 'Stockfish', version: '17' };
  }
}

function createParsedGame(): ParsedPgn {
  return {
    moves: [
      { ply: 1, color: 'w', beforeFen: 'f0', afterFen: 'f1' },
      { ply: 2, color: 'b', beforeFen: 'f1', afterFen: 'f2' },
      { ply: 3, color: 'w', beforeFen: 'f2', afterFen: 'f3' },
    ],
  } as ParsedPgn;
}

function createFourPlyGame(): ParsedPgn {
  return {
    moves: [
      { ply: 1, color: 'w', beforeFen: 'f0', afterFen: 'f1' },
      { ply: 2, color: 'b', beforeFen: 'f1', afterFen: 'f2' },
      { ply: 3, color: 'w', beforeFen: 'f2', afterFen: 'f3' },
      { ply: 4, color: 'b', beforeFen: 'f3', afterFen: 'f4' },
    ],
  } as ParsedPgn;
}
