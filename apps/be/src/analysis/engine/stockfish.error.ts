export type StockfishErrorCode =
  | 'BINARY_START_FAILURE'
  | 'UNEXPECTED_PROCESS_EXIT'
  | 'UCI_PROTOCOL_FAILURE'
  | 'HARD_TIMEOUT'
  | 'INVALID_ANALYSIS_REQUEST';

export class StockfishError extends Error {
  constructor(
    readonly code: StockfishErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'StockfishError';
  }
}
