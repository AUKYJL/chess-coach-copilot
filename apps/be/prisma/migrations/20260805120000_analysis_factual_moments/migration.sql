-- CreateEnum
CREATE TYPE "MoveColor" AS ENUM ('WHITE', 'BLACK');

-- Drop old derived tables
DROP TABLE "Mistake";
DROP TABLE "CriticalMoment";

-- Create factual critical moments table
CREATE TABLE "CriticalMoment" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "ply" INTEGER NOT NULL,
    "fullMoveNumber" INTEGER NOT NULL,
    "moveNumber" TEXT NOT NULL,
    "moveColor" "MoveColor" NOT NULL,
    "san" TEXT NOT NULL,
    "lan" TEXT,
    "uci" TEXT,
    "beforeFen" TEXT NOT NULL,
    "afterFen" TEXT NOT NULL,
    "bestMove" TEXT,
    "bestVariation" JSONB NOT NULL,
    "nags" JSONB NOT NULL,
    "comments" JSONB NOT NULL,
    "evaluationBefore" JSONB,
    "evaluationAfter" JSONB,
    "severity" "MomentSeverity" NOT NULL DEFAULT 'UNKNOWN',
    "sourceEvidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CriticalMoment_pkey" PRIMARY KEY ("id")
);

-- Create LLM mistake table
CREATE TABLE "Mistake" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "criticalMomentId" TEXT,
    "severity" "MomentSeverity" NOT NULL DEFAULT 'UNKNOWN',
    "category" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "suggestedFix" TEXT,
    "sourceEvidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mistake_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "CriticalMoment_analysisId_idx" ON "CriticalMoment"("analysisId");
CREATE INDEX "CriticalMoment_analysisId_ply_idx" ON "CriticalMoment"("analysisId", "ply");
CREATE INDEX "Mistake_analysisId_idx" ON "Mistake"("analysisId");
CREATE INDEX "Mistake_criticalMomentId_idx" ON "Mistake"("criticalMomentId");

-- Foreign keys
ALTER TABLE "CriticalMoment"
ADD CONSTRAINT "CriticalMoment_analysisId_fkey"
FOREIGN KEY ("analysisId") REFERENCES "GameAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Mistake"
ADD CONSTRAINT "Mistake_analysisId_fkey"
FOREIGN KEY ("analysisId") REFERENCES "GameAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Mistake"
ADD CONSTRAINT "Mistake_criticalMomentId_fkey"
FOREIGN KEY ("criticalMomentId") REFERENCES "CriticalMoment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
