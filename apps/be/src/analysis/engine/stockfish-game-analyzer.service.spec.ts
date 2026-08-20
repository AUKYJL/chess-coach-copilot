import { StudentColor } from '../../generated/prisma/client.js';
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
});

class FakeStockfishAdapter {
  readonly calls: Array<{ fen: string; nodes: number; timeoutMs: number }> = [];
  startNewGameCalls = 0;

  constructor(
    private readonly evaluations: Record<
      string,
      StockfishPositionAnalysis['evaluation']
    >,
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
      principalVariation: ['e2e4', 'e7e5'],
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
