import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { stockfishConfig } from '../../config/index.js';
import type { EngineEvaluation } from '../preparation/engine-evidence.model.js';
import { StockfishError } from './stockfish.error.js';
import { normalizeUciScore } from './stockfish-score.util.js';

export interface StockfishPositionAnalysis {
  evaluation: EngineEvaluation;
  bestMove: string | null;
  principalVariation: string[];
  depth: number | null;
  nodes: number | null;
}

export interface StockfishEngineIdentity {
  name: string | null;
  version: string | null;
}

type PendingLine = {
  matches: (line: string) => boolean;
  resolve: (line: string) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
};

@Injectable()
export class StockfishUciAdapter implements OnModuleDestroy {
  private process: ChildProcessWithoutNullStreams | null = null;
  private pendingLine: PendingLine | null = null;
  private lineBuffer = '';
  private latestInfo: StockfishPositionAnalysis | null = null;
  private currentSideToMove: 'w' | 'b' | null = null;
  private identity: StockfishEngineIdentity = { name: null, version: null };
  private queue = Promise.resolve();
  private shuttingDown = false;

  constructor(
    private readonly logger: PinoLogger,
    @Inject(stockfishConfig.KEY)
    private readonly configuration: ConfigType<typeof stockfishConfig>,
  ) {
    this.logger.setContext(StockfishUciAdapter.name);
  }

  async verifyAvailable(): Promise<void> {
    await this.ensureReady();
  }

  analyzePosition(
    fen: string,
    nodes: number,
    timeoutMs = this.configuration.positionHardTimeoutMs,
  ): Promise<StockfishPositionAnalysis> {
    return this.enqueue(() =>
      this.analyzePositionInternal(fen, nodes, timeoutMs),
    );
  }

  startNewGame(): Promise<void> {
    return this.enqueue(async () => {
      const process = await this.ensureReady();
      process.stdin.write('ucinewgame\n');
      await this.waitForReady(
        process,
        this.configuration.positionHardTimeoutMs,
      );
    });
  }

  getIdentity(): StockfishEngineIdentity {
    return this.identity;
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    await this.queue.catch(() => undefined);
    const process = this.process;

    if (!process) {
      return;
    }

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        process.kill();
        resolve();
      }, 1_000);

      process.once('close', () => {
        clearTimeout(timeout);
        resolve();
      });
      process.stdin.write('quit\n');
    });
  }

  private enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const previous = this.queue.catch(() => undefined);
    let release: () => void;
    this.queue = new Promise<void>((resolve) => {
      release = resolve;
    });

    return previous.then(operation).finally(release!);
  }

  private async analyzePositionInternal(
    fen: string,
    nodes: number,
    timeoutMs: number,
  ): Promise<StockfishPositionAnalysis> {
    if (fen.trim().length === 0 || !Number.isInteger(nodes) || nodes <= 0) {
      throw new StockfishError(
        'INVALID_ANALYSIS_REQUEST',
        'Stockfish analysis requires a FEN and a positive node limit',
      );
    }

    if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
      throw new StockfishError(
        'INVALID_ANALYSIS_REQUEST',
        'Stockfish analysis requires a positive hard timeout',
      );
    }

    const process = await this.ensureReady();
    const sideToMove = getSideToMoveFromFen(fen);
    if (!sideToMove) {
      throw new StockfishError(
        'INVALID_ANALYSIS_REQUEST',
        'Stockfish analysis requires a valid FEN side-to-move field',
      );
    }

    this.latestInfo = null;
    this.currentSideToMove = sideToMove;
    const bestMoveResponse = this.waitForLine(
      process,
      (line) => line.startsWith('bestmove '),
      timeoutMs,
    );
    process.stdin.write(`position fen ${fen}\n`);
    process.stdin.write(`go nodes ${nodes}\n`);
    const bestMoveLine = await bestMoveResponse;
    const bestMove = parseBestMove(bestMoveLine);

    const latestInfo = this.latestInfo as StockfishPositionAnalysis | null;
    if (!latestInfo) {
      throw new StockfishError(
        'UCI_PROTOCOL_FAILURE',
        'Stockfish returned bestmove without a scored info line',
      );
    }

    return {
      ...latestInfo,
      bestMove,
    };
  }

  private async ensureReady(): Promise<ChildProcessWithoutNullStreams> {
    if (this.shuttingDown) {
      throw new StockfishError(
        'UNEXPECTED_PROCESS_EXIT',
        'Stockfish adapter is shutting down',
      );
    }

    if (this.process) {
      return this.process;
    }

    if (!this.configuration.binaryPath) {
      throw new StockfishError(
        'BINARY_START_FAILURE',
        'STOCKFISH_PATH is required when starting the Stockfish worker',
      );
    }

    const process = spawn(this.configuration.binaryPath, [], { shell: false });
    this.process = process;
    this.lineBuffer = '';
    this.identity = { name: null, version: null };
    process.stdout.on('data', (chunk: Buffer) => this.handleStdout(chunk));
    process.on('error', (error: Error) =>
      this.handleProcessFailure(process, error),
    );
    process.on('exit', (code, signal) => {
      if (!this.shuttingDown) {
        this.handleProcessFailure(
          process,
          new StockfishError(
            'UNEXPECTED_PROCESS_EXIT',
            `Stockfish exited unexpectedly (code ${code ?? 'null'}, signal ${signal ?? 'null'})`,
          ),
        );
      }
    });

    const uciOk = this.waitForLine(
      process,
      (line) => line === 'uciok',
      this.configuration.positionHardTimeoutMs,
    );
    process.stdin.write('uci\n');
    await uciOk;
    process.stdin.write(
      `setoption name Threads value ${this.configuration.threads}\n`,
    );
    process.stdin.write(
      `setoption name Hash value ${this.configuration.hashMb}\n`,
    );
    process.stdin.write(
      `setoption name MultiPV value ${this.configuration.multiPv}\n`,
    );
    await this.waitForReady(process, this.configuration.positionHardTimeoutMs);

    return process;
  }

  private waitForReady(
    process: ChildProcessWithoutNullStreams,
    timeoutMs: number,
  ): Promise<string> {
    const ready = this.waitForLine(
      process,
      (line) => line === 'readyok',
      timeoutMs,
    );
    process.stdin.write('isready\n');
    return ready;
  }

  private waitForLine(
    process: ChildProcessWithoutNullStreams,
    matches: (line: string) => boolean,
    timeoutMs: number,
  ): Promise<string> {
    if (this.pendingLine) {
      throw new StockfishError(
        'UCI_PROTOCOL_FAILURE',
        'Stockfish command attempted while another response was pending',
      );
    }

    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const error = new StockfishError(
          'HARD_TIMEOUT',
          `Stockfish did not respond within ${timeoutMs}ms`,
        );
        this.rejectPending(error);
        this.resetProcess(process);
      }, timeoutMs);

      this.pendingLine = { matches, resolve, reject, timeout };
    });
  }

  private handleStdout(chunk: Buffer): void {
    this.lineBuffer += chunk.toString();
    const lines = this.lineBuffer.split(/\r?\n/);
    this.lineBuffer = lines.pop() ?? '';

    for (const line of lines) {
      this.handleLine(line.trim());
    }
  }

  private handleLine(line: string): void {
    if (line.startsWith('id name ')) {
      this.identity = parseIdentity(line.slice('id name '.length).trim());
    }
    if (line.startsWith('info ')) {
      const info = this.currentSideToMove
        ? parseInfo(line, this.currentSideToMove)
        : null;
      if (info) {
        this.latestInfo = info;
      }
    }

    const pending = this.pendingLine;
    if (pending?.matches(line)) {
      this.pendingLine = null;
      clearTimeout(pending.timeout);
      pending.resolve(line);
    }
  }

  private handleProcessFailure(
    process: ChildProcessWithoutNullStreams,
    error: Error,
  ): void {
    if (this.process !== process) {
      return;
    }

    this.process = null;
    this.logger.warn(
      {
        event: 'stockfish_restart_scheduled',
        failureCode:
          error instanceof StockfishError ? error.code : 'BINARY_START_FAILURE',
      },
      'Stockfish process stopped; it will restart for the next request',
    );
    this.rejectPending(
      error instanceof StockfishError
        ? error
        : new StockfishError('BINARY_START_FAILURE', error.message),
    );
  }

  private rejectPending(error: Error): void {
    const pending = this.pendingLine;
    if (!pending) {
      return;
    }

    this.pendingLine = null;
    clearTimeout(pending.timeout);
    pending.reject(error);
  }

  private resetProcess(process: ChildProcessWithoutNullStreams): void {
    if (this.process !== process) {
      return;
    }

    this.process = null;
    process.kill();
  }
}

function parseInfo(
  line: string,
  sideToMove: 'w' | 'b',
): StockfishPositionAnalysis | null {
  const score = /\bscore\s+(cp|mate)\s+(-?\d+)/.exec(line);

  if (!score) {
    return null;
  }

  const pv = /\bpv\s+(.+)$/.exec(line)?.[1]?.trim().split(/\s+/) ?? [];
  const depth = toOptionalInteger(/\bdepth\s+(\d+)/.exec(line)?.[1]);
  const nodes = toOptionalInteger(/\bnodes\s+(\d+)/.exec(line)?.[1]);

  return {
    evaluation: normalizeUciScore(
      score[1] as 'cp' | 'mate',
      Number(score[2]),
      sideToMove,
    ),
    bestMove: null,
    principalVariation: pv,
    depth,
    nodes,
  };
}

function getSideToMoveFromFen(fen: string): 'w' | 'b' | null {
  const sideToMove = fen.trim().split(/\s+/)[1];
  return sideToMove === 'w' || sideToMove === 'b' ? sideToMove : null;
}

function parseBestMove(line: string): string | null {
  const bestMove = /^bestmove\s+(\S+)/.exec(line)?.[1];
  return bestMove && bestMove !== '(none)' ? bestMove : null;
}

function toOptionalInteger(value: string | undefined): number | null {
  return value === undefined ? null : Number(value);
}

function parseIdentity(value: string): StockfishEngineIdentity {
  const stockfish = /^Stockfish\s+(.+)$/.exec(value);

  return stockfish
    ? { name: 'Stockfish', version: stockfish[1] }
    : { name: value || null, version: null };
}
