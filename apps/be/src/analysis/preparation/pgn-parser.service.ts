import { BadRequestException, Injectable } from '@nestjs/common';
import { parse, parseGame } from '@mliebelt/pgn-parser';
import type { ParseTree } from '@mliebelt/pgn-parser';
import { Chess, type Move } from 'chess.js';
import { StudentColor } from '../../generated/prisma/client.js';
import type {
  ParsedPgn,
  PositionEvaluation,
  PreparedMove,
} from './annotated-game.model.js';
import {
  adaptParseTreeMetadata,
  adaptParserMove,
} from './mliebelt-pgn-adapter.js';

export type { ParsedPgn } from './annotated-game.model.js';

@Injectable()
export class PgnParserService {
  parse(rawPgn: string, studentColor: StudentColor): ParsedPgn {
    const parseTree = this.parseSingleGame(rawPgn);
    const metadata = adaptParseTreeMetadata(parseTree, studentColor);
    const chess = metadata.replayStartFen
      ? new Chess(metadata.replayStartFen)
      : new Chess();
    const moves = parseTree.moves.map((parserMove, index) =>
      this.replayMove(chess, adaptParserMove(parserMove), index),
    );
    let previousEvaluation: PositionEvaluation | null = null;

    const enrichedMoves = moves.map((move) => {
      const enrichedMove: PreparedMove = {
        ...move,
        evaluationBefore: previousEvaluation,
      };

      previousEvaluation = move.evaluationAfter;

      return enrichedMove;
    });

    return {
      headers: metadata.headers,
      rawTags: metadata.rawTags,
      diagnostics: metadata.diagnostics,
      moves: enrichedMoves,
      result: metadata.result,
      rawResult: metadata.rawResult,
      studentColor,
    };
  }

  parseWithGenericGameRule(
    rawPgn: string,
    studentColor: StudentColor,
  ): ParsedPgn {
    const parseTree = this.parseSingleGameWithStartRule(rawPgn);
    const metadata = adaptParseTreeMetadata(parseTree, studentColor);
    const chess = metadata.replayStartFen
      ? new Chess(metadata.replayStartFen)
      : new Chess();
    const moves = parseTree.moves.map((parserMove, index) =>
      this.replayMove(chess, adaptParserMove(parserMove), index),
    );
    let previousEvaluation: PositionEvaluation | null = null;

    return {
      headers: metadata.headers,
      rawTags: metadata.rawTags,
      diagnostics: metadata.diagnostics,
      moves: moves.map((move) => {
        const enrichedMove: PreparedMove = {
          ...move,
          evaluationBefore: previousEvaluation,
        };

        previousEvaluation = move.evaluationAfter;

        return enrichedMove;
      }),
      result: metadata.result,
      rawResult: metadata.rawResult,
      studentColor,
    };
  }

  private parseSingleGame(rawPgn: string) {
    try {
      return parseGame(rawPgn);
    } catch (error) {
      throw new BadRequestException(this.formatParseError(error));
    }
  }

  private parseSingleGameWithStartRule(rawPgn: string) {
    try {
      return parse(rawPgn, { startRule: 'game' }) as ParseTree;
    } catch (error) {
      throw new BadRequestException(this.formatParseError(error));
    }
  }

  private replayMove(
    chess: Chess,
    parserMove: ReturnType<typeof adaptParserMove>,
    index: number,
  ): PreparedMove {
    const beforeFen = chess.fen();
    let move: Move;

    try {
      move = chess.move(parserMove.san, { strict: true });
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error
          ? `Invalid mainline move ${index + 1} (${parserMove.san}): ${error.message}`
          : `Invalid mainline move ${index + 1} (${parserMove.san})`,
      );
    }

    const ply = index + 1;

    return {
      ply,
      fullMoveNumber: Math.floor(index / 2) + 1,
      moveNumber: `${Math.floor(index / 2) + 1}${move.color === 'b' ? '...' : '.'}`,
      color: move.color,
      san: move.san,
      lan: move.lan,
      uci: `${move.from}${move.to}${move.promotion ?? ''}` || null,
      beforeFen,
      afterFen: move.after,
      from: move.from,
      to: move.to,
      promotion: move.promotion ?? null,
      nags: parserMove.nags,
      comments: parserMove.comments,
      rawComment: parserMove.rawComment,
      bestMove: parserMove.bestMove,
      bestVariation: parserMove.bestVariation,
      bestVariationMoves: parserMove.bestVariationMoves,
      evaluationBefore: null,
      evaluationAfter: parserMove.evaluationAfter,
      sourceEvidence: {
        ...parserMove.sourceEvidence,
        parserSan: parserMove.san,
      },
    };
  }

  private formatParseError(error: unknown): string {
    return error instanceof Error
      ? `Invalid PGN: ${error.message}`
      : 'PGN must describe a valid parseable chess game';
  }
}
