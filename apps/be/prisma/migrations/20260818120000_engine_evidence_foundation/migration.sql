-- CreateEnum
CREATE TYPE "EngineEvidenceStatus" AS ENUM ('READY', 'QUEUED', 'RUNNING', 'FAILED');

-- CreateEnum
CREATE TYPE "EngineEvidenceSource" AS ENUM ('PGN', 'STOCKFISH');

-- AlterTable
ALTER TABLE "Game"
ADD COLUMN "engineEvidence" JSONB,
ADD COLUMN "engineEvidenceStatus" "EngineEvidenceStatus",
ADD COLUMN "engineEvidenceSource" "EngineEvidenceSource";
