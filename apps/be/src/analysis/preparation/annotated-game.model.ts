import type {
  GameResult,
  StudentColor,
} from '../../generated/prisma/client.js';
import type { JsonObject } from '../../shared/types/json-value.type.js';

export type StableHeaders = {
  event: string | null;
  site: string | null;
  white: string | null;
  black: string | null;
  result: string | null;
  opening: string | null;
  eco: string | null;
  annotator: string | null;
  initialFen: string | null;
  setUp: string | null;
};

export type PositionEvaluation =
  | {
      kind: 'centipawns';
      value: number;
      raw: number | string;
    }
  | {
      kind: 'mate';
      moves: number;
      raw: string;
    };

export interface ParserDiagnostic {
  type: 'unknown-tag-warning' | 'parser-warning';
  key: string | null;
  value: string | null;
  message: string;
  location: JsonObject | null;
}

export interface PreparedVariationMove {
  moveNumber: number | null;
  color: 'w' | 'b';
  san: string;
}

export interface PreparedMove {
  ply: number;
  fullMoveNumber: number;
  moveNumber: string;
  color: 'w' | 'b';
  san: string;
  lan: string | null;
  uci: string | null;
  beforeFen: string;
  afterFen: string;
  from: string;
  to: string;
  promotion: string | null;
  nags: string[];
  comments: string[];
  rawComment: string | null;
  bestMove: string | null;
  bestVariation: string[];
  bestVariationMoves: PreparedVariationMove[];
  evaluationBefore: PositionEvaluation | null;
  evaluationAfter: PositionEvaluation | null;
  sourceEvidence: JsonObject;
}

export interface ParsedPgn {
  headers: StableHeaders;
  rawTags: JsonObject;
  diagnostics: ParserDiagnostic[];
  moves: PreparedMove[];
  result: GameResult;
  rawResult: string | null;
  studentColor: StudentColor;
}
