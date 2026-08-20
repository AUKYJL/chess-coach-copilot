import { StockfishUciAdapter } from '../../src/analysis/engine/stockfish-uci.adapter.js';

const runRealStockfish = process.env.RUN_STOCKFISH_INTEGRATION === '1';
const stockfishPath = process.env.STOCKFISH_PATH;
const testRealStockfish = runRealStockfish && stockfishPath ? test : test.skip;

testRealStockfish(
  'completes the UCI handshake with the configured Stockfish binary',
  async () => {
    const adapter = new StockfishUciAdapter(
      { setContext: () => undefined, warn: () => undefined } as never,
      {
        binaryPath: stockfishPath!,
        threads: 1,
        hashMb: 32,
        multiPv: 1,
        scanNodes: 100_000,
        deepNodes: 500_000,
        maxDeepMoves: 8,
        positionHardTimeoutMs: 30_000,
        gameHardTimeoutMs: 10 * 60_000,
      },
    );

    try {
      await adapter.verifyAvailable();
    } finally {
      await adapter.onModuleDestroy();
    }
  },
  40_000,
);
