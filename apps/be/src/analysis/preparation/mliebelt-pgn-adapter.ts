import type { ParseTree } from '@mliebelt/pgn-parser';
import type { PgnMove } from '@mliebelt/pgn-types';
import { GameResult, StudentColor } from '../../generated/prisma/client.js';
import type { JsonObject } from '../../shared/types/json-value.type.js';
import {
  toJsonObject,
  toJsonValue,
} from '../../shared/utils/json-value.util.js';
import type {
  ParserDiagnostic,
  PositionEvaluation,
  PreparedVariationMove,
  StableHeaders,
} from './annotated-game.model.js';

type ParserMove = ParseTree['moves'][number];

export interface AdaptedPgnMetadata {
  headers: StableHeaders;
  rawTags: JsonObject;
  diagnostics: ParserDiagnostic[];
  replayStartFen: string | null;
  rawResult: string | null;
  result: GameResult;
}

export interface AdaptedParserMove {
  moveNumber: number;
  color: 'w' | 'b';
  san: string;
  nags: string[];
  comments: string[];
  rawComment: string | null;
  bestMove: string | null;
  bestVariation: string[];
  bestVariationMoves: PreparedVariationMove[];
  evaluationAfter: PositionEvaluation | null;
  sourceEvidence: JsonObject;
}

export function adaptParseTreeMetadata(
  parseTree: ParseTree,
  studentColor: StudentColor,
): AdaptedPgnMetadata {
  const rawTags = normalizeRawTags(parseTree.tags);
  const headers = normalizeHeaders(rawTags);
  const rawResult = asOptionalString(rawTags.Result);

  return {
    headers,
    rawTags,
    diagnostics: normalizeDiagnostics(parseTree, rawTags),
    replayStartFen: headers.setUp === '1' ? headers.initialFen : null,
    rawResult,
    result: mapGameResult(rawResult, studentColor),
  };
}

export function adaptParserMove(move: ParserMove): AdaptedParserMove {
  const san = move.notation.notation;
  const comments = extractComments(move);
  const rawComment = comments[0] ?? null;
  const bestVariationMoves = extractBestVariationMoves(move.variations);
  const bestVariation = bestVariationMoves.map(
    (variationMove) => variationMove.san,
  );

  return {
    moveNumber: move.moveNumber ?? 0,
    color: move.turn,
    san,
    nags: normalizeNagList(move.nag),
    comments,
    rawComment,
    bestMove: bestVariation[0] ?? null,
    bestVariation,
    bestVariationMoves,
    evaluationAfter: normalizeEvaluation(move.commentDiag?.eval),
    sourceEvidence: {
      parserMoveNumber: move.moveNumber ?? null,
      parserTurn: move.turn,
      parserNotation: toJsonObject(move.notation),
      parserNag: move.nag ?? [],
      parserCommentDiag: toJsonObject(move.commentDiag),
      parserCommentMove: move.commentMove ?? null,
      parserCommentAfter: move.commentAfter ?? null,
      parserVariations: toJsonValue(move.variations) ?? [],
    },
  };
}

function normalizeRawTags(tags: ParseTree['tags'] | undefined): JsonObject {
  if (!tags) {
    return {};
  }

  return (
    toJsonObject(
      Object.fromEntries(
        Object.entries(tags).map(([key, value]) => [key, value]),
      ),
    ) ?? {}
  );
}

function normalizeHeaders(rawTags: JsonObject): StableHeaders {
  return {
    event: asOptionalString(rawTags.Event),
    site: asOptionalString(rawTags.Site),
    white: asOptionalString(rawTags.White),
    black: asOptionalString(rawTags.Black),
    result: asOptionalString(rawTags.Result),
    opening: asOptionalString(rawTags.Opening),
    eco: asOptionalString(rawTags.ECO),
    annotator: asOptionalString(rawTags.Annotator),
    initialFen: asOptionalString(rawTags.FEN),
    setUp: asOptionalString(rawTags.SetUp),
  };
}

function normalizeDiagnostics(
  parseTree: ParseTree,
  rawTags: JsonObject,
): ParserDiagnostic[] {
  const parserMessages = Array.isArray(parseTree.messages)
    ? parseTree.messages
    : [];

  return parserMessages.map((message) => ({
    type:
      message.key in rawTags && !isKnownTag(message.key)
        ? 'unknown-tag-warning'
        : 'parser-warning',
    key: message.key ?? null,
    value: message.value ?? null,
    message: message.message,
    location: extractMessageLocation(message),
  }));
}

function extractMessageLocation(
  message: Record<string, unknown>,
): JsonObject | null {
  const location: JsonObject = {};

  for (const key of ['start', 'end']) {
    const jsonValue = toJsonValue(message[key]);

    if (jsonValue !== undefined) {
      location[key] = jsonValue;
    }
  }

  return Object.keys(location).length > 0 ? location : null;
}

function extractComments(move: ParserMove): string[] {
  const values = [
    move.commentDiag?.comment,
    move.commentMove,
    move.commentAfter,
  ]
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return [...new Set(values)];
}

function normalizeNagList(nag: string[] | null | undefined): string[] {
  return Array.isArray(nag) ? [...nag] : [];
}

function extractBestVariationMoves(
  variations: PgnMove[][] | null | undefined,
): PreparedVariationMove[] {
  if (!Array.isArray(variations)) {
    return [];
  }

  for (const variation of variations) {
    if (!Array.isArray(variation) || variation.length === 0) {
      continue;
    }

    const moves: PreparedVariationMove[] = [];

    for (const move of variation) {
      const san = move.notation?.notation;

      if (typeof san !== 'string' || san.length === 0 || !move.turn) {
        continue;
      }

      moves.push({
        moveNumber: move.moveNumber ?? null,
        color: move.turn,
        san,
      });
    }

    if (moves.length > 0) {
      return moves;
    }
  }

  return [];
}

function normalizeEvaluation(value: unknown): PositionEvaluation | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return {
      kind: 'centipawns',
      value: Math.round(value * 100),
      raw: value,
    };
  }

  if (typeof value === 'string') {
    const match = value.match(/^#(-?\d+)$/);

    if (match) {
      return {
        kind: 'mate',
        moves: Number(match[1]),
        raw: value,
      };
    }
  }

  return null;
}

function mapGameResult(
  rawResult: string | null,
  studentColor: StudentColor,
): GameResult {
  if (rawResult === '1/2-1/2') {
    return GameResult.DRAW;
  }

  if (rawResult === '1-0') {
    return studentColor === StudentColor.WHITE
      ? GameResult.WIN
      : GameResult.LOSS;
  }

  if (rawResult === '0-1') {
    return studentColor === StudentColor.BLACK
      ? GameResult.WIN
      : GameResult.LOSS;
  }

  return GameResult.UNKNOWN;
}

function asOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function isKnownTag(key: string): boolean {
  return new Set([
    'Event',
    'Site',
    'Date',
    'Round',
    'White',
    'Black',
    'Result',
    'WhiteTitle',
    'BlackTitle',
    'WhiteElo',
    'BlackElo',
    'WhiteUSCF',
    'BlackUSCF',
    'WhiteNA',
    'BlackNA',
    'WhiteType',
    'BlackType',
    'EventSponsor',
    'Section',
    'Stage',
    'Board',
    'Opening',
    'Variation',
    'SubVariation',
    'ECO',
    'NIC',
    'SetUp',
    'FEN',
    'Termination',
    'Annotator',
    'Mode',
    'PlyCount',
    'PuzzleEngine',
    'PuzzleMakerVersion',
    'PuzzleCategory',
    'PuzzleWinner',
    'Variant',
    'WhiteRatingDiff',
    'BlackRatingDiff',
    'WhiteFideId',
    'BlackFideId',
    'WhiteTeam',
    'BlackTeam',
    'Orientation',
    'Clock',
    'WhiteClock',
    'BlackClock',
    'TimeControl',
    'EventDate',
    'UTCDate',
    'Time',
    'UTCTime',
  ]).has(key);
}
