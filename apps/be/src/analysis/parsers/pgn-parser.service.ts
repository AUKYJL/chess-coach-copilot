import { BadRequestException, Injectable } from '@nestjs/common';
import { Chess } from 'chess.js';
import { GameResult } from '../../generated/prisma/client.js';
import { normalizePgn } from '../pgn-normalization.util.js';

export interface ParsedPgnComment {
  fen: string;
  comment: string;
}

export interface ParsedPgn {
  headers: Record<string, string>;
  moves: Array<{
    moveNumber: string;
    san: string;
    color: 'w' | 'b';
    fen: string;
  }>;
  comments: ParsedPgnComment[];
  result: GameResult;
}

@Injectable()
export class PgnParserService {
  parse(rawPgn: string): ParsedPgn {
    const chess = new Chess();
    const normalizedPgn = normalizePgn(rawPgn);

    try {
      chess.loadPgn(normalizedPgn);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? `Invalid PGN: ${error.message}`
          : 'PGN must describe a valid parseable chess game',
      );
    }

    const headers = chess.getHeaders();
    const moves = chess.history({ verbose: true }).map((move, index) => ({
      moveNumber: `${Math.floor(index / 2) + 1}${move.color === 'b' ? '...' : '.'}`,
      san: move.san,
      color: move.color,
      fen: move.after,
    }));
    const comments = chess.getComments();

    return {
      headers,
      moves,
      comments,
      result: this.mapResult(headers.Result),
    };
  }

  private mapResult(result: string | undefined): GameResult {
    if (result === '1-0' || result === '0-1') {
      return GameResult.WIN;
    }

    if (result === '1/2-1/2') {
      return GameResult.DRAW;
    }

    return GameResult.UNKNOWN;
  }
}
