import { z } from 'zod';

export const ENGINE_EVIDENCE_SCHEMA_VERSION = 1;

const engineEvaluationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('cp'), value: z.number().int() }),
  z.object({ type: z.literal('mate'), value: z.number().int() }),
]);

const enginePositionEvidenceSchema = z.object({
  ply: z.number().int().nonnegative(),
  fen: z.string().min(1),
  evaluation: engineEvaluationSchema,
  bestMove: z.string().min(1).optional(),
  principalVariation: z.array(z.string().min(1)).optional(),
  depth: z.number().int().positive().optional(),
  nodes: z.number().int().nonnegative().optional(),
});

export const engineEvidenceSchema = z.object({
  schemaVersion: z.literal(ENGINE_EVIDENCE_SCHEMA_VERSION),
  source: z.enum(['PGN', 'STOCKFISH']),
  positions: z.array(enginePositionEvidenceSchema),
  engine: z
    .object({
      name: z.string().min(1).optional(),
      version: z.string().min(1).optional(),
    })
    .optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export type EngineEvaluation = z.infer<typeof engineEvaluationSchema>;
export type EnginePositionEvidence = z.infer<
  typeof enginePositionEvidenceSchema
>;
export type EngineEvidence = z.infer<typeof engineEvidenceSchema>;

export interface EngineEvidenceMissingPosition {
  ply: number;
  fen: string;
  role: 'before' | 'after';
}

export interface EngineEvidenceInspection {
  sufficient: boolean;
  analyzedStudentMoveCount: number;
  coveredStudentMoveCount: number;
  missing: EngineEvidenceMissingPosition[];
}
