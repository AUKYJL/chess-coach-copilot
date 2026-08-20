import { registerAs } from '@nestjs/config';
import { getOptionalEnv } from './env.validation.js';

const THREADS = 1;
const HASH_MB = 32;
const MULTI_PV = 1;
const SCAN_NODES = 100_000;
const DEEP_NODES = 500_000;
const MAX_DEEP_MOVES = 8;
const POSITION_HARD_TIMEOUT_MS = 30_000;
const GAME_HARD_TIMEOUT_MS = 10 * 60_000;

export default registerAs('stockfish', () => ({
  binaryPath: getOptionalEnv('STOCKFISH_PATH'),
  threads: THREADS,
  hashMb: HASH_MB,
  multiPv: MULTI_PV,
  scanNodes: SCAN_NODES,
  deepNodes: DEEP_NODES,
  maxDeepMoves: MAX_DEEP_MOVES,
  positionHardTimeoutMs: POSITION_HARD_TIMEOUT_MS,
  gameHardTimeoutMs: GAME_HARD_TIMEOUT_MS,
}));
