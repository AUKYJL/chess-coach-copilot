import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { jest } from '@jest/globals';

const spawnMock = jest.fn();

jest.unstable_mockModule('node:child_process', () => ({ spawn: spawnMock }));

const { StockfishUciAdapter } = await import('./stockfish-uci.adapter.js');

const configuration = {
  binaryPath: '/test/stockfish',
  threads: 1,
  hashMb: 32,
  multiPv: 1,
  scanNodes: 100,
  deepNodes: 500,
  maxDeepMoves: 8,
  positionHardTimeoutMs: 100,
  gameHardTimeoutMs: 1_000,
};
const FEN = 'rnbqkbnr/pppppppp/8/8/8/8/8/8 w - - 0 1';

describe('StockfishUciAdapter', () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it('keeps one process, completes the UCI handshake, and parses final output', async () => {
    const process = createProcess();
    spawnMock.mockReturnValue(process);
    const adapter = new StockfishUciAdapter(configuration);

    await adapter.startNewGame();
    const analysis = await adapter.analyzePosition(FEN, 100);

    expect(spawnMock).toHaveBeenCalledWith('/test/stockfish', [], {
      shell: false,
    });
    expect(process.commands).toEqual([
      'uci',
      'setoption name Threads value 1',
      'setoption name Hash value 32',
      'setoption name MultiPV value 1',
      'isready',
      'ucinewgame',
      'isready',
      `position fen ${FEN}`,
      'go nodes 100',
    ]);
    expect(analysis).toEqual({
      evaluation: { type: 'cp', value: 42 },
      bestMove: 'e2e4',
      principalVariation: ['e2e4', 'e7e5'],
      depth: 12,
      nodes: 100,
    });
    expect(adapter.getIdentity()).toEqual({ name: 'Stockfish', version: '17' });
  });

  it('normalizes Black-to-move scores and serializes concurrent requests', async () => {
    const process = createProcess();
    spawnMock.mockReturnValue(process);
    const adapter = new StockfishUciAdapter(configuration);
    const blackFen = FEN.replace(' w ', ' b ');

    const [first, second] = await Promise.all([
      adapter.analyzePosition(FEN, 100),
      adapter.analyzePosition(blackFen, 100),
    ]);

    expect(first.evaluation).toEqual({ type: 'cp', value: 42 });
    expect(second.evaluation).toEqual({ type: 'cp', value: -42 });
    expect(
      process.commands.filter((command) => command.startsWith('go nodes')),
    ).toEqual(['go nodes 100', 'go nodes 100']);
  });

  it('fails the pending request after an unexpected exit and restarts lazily', async () => {
    const failedProcess = createProcess({ exitOnGo: true });
    const restartedProcess = createProcess();
    spawnMock
      .mockReturnValueOnce(failedProcess)
      .mockReturnValueOnce(restartedProcess);
    const adapter = new StockfishUciAdapter(configuration);

    await expect(adapter.analyzePosition(FEN, 100)).rejects.toMatchObject({
      code: 'UNEXPECTED_PROCESS_EXIT',
    });
    await expect(adapter.analyzePosition(FEN, 100)).resolves.toMatchObject({
      bestMove: 'e2e4',
    });
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });

  it('times out, terminates the session, and shuts down with quit', async () => {
    const timedOutProcess = createProcess({ noGoResponse: true });
    const restartedProcess = createProcess();
    spawnMock
      .mockReturnValueOnce(timedOutProcess)
      .mockReturnValueOnce(restartedProcess);
    const adapter = new StockfishUciAdapter({
      ...configuration,
      positionHardTimeoutMs: 1,
    });

    await expect(adapter.analyzePosition(FEN, 100)).rejects.toMatchObject({
      code: 'HARD_TIMEOUT',
    });
    expect(timedOutProcess.kill).toHaveBeenCalled();
    await adapter.analyzePosition(FEN, 100);
    await adapter.onModuleDestroy();
    expect(restartedProcess.commands).toContain('quit');
  });
});

function createProcess(
  options: { exitOnGo?: boolean; noGoResponse?: boolean } = {},
) {
  const process = new EventEmitter() as EventEmitter & {
    stdin: Writable;
    stdout: PassThrough;
    commands: string[];
    kill: jest.Mock;
  };
  process.commands = [];
  process.stdout = new PassThrough();
  process.kill = jest.fn(() => {
    process.emit('exit', null, 'SIGTERM');
    process.emit('close');
  });
  process.stdin = new Writable({
    write(
      chunk: Buffer,
      _encoding: BufferEncoding,
      callback: (error?: Error | null) => void,
    ) {
      const command = chunk.toString().trim();
      process.commands.push(command);
      respond(command);
      callback();
    },
  });

  function respond(command: string): void {
    if (command === 'uci') {
      process.stdout.write('id name Stockfish 17\nuciok\n');
      return;
    }
    if (command === 'isready') {
      process.stdout.write('readyok\n');
      return;
    }
    if (!command.startsWith('go nodes')) {
      return;
    }
    if (options.exitOnGo) {
      process.emit('exit', 1, null);
      return;
    }
    if (options.noGoResponse) {
      return;
    }
    process.stdout.write(
      'info depth 12 nodes 100 score cp 42 pv e2e4 e7e5\nbestmove e2e4\n',
    );
  }

  return process;
}
