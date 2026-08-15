-- AlterTable
ALTER TABLE "AnalysisJob" ADD COLUMN "traceId" TEXT;

UPDATE "AnalysisJob"
SET "traceId" = "id"
WHERE "traceId" IS NULL;

ALTER TABLE "AnalysisJob" ALTER COLUMN "traceId" SET NOT NULL;

-- CreateTable
CREATE TABLE "AnalysisJobEvent" (
    "id" TEXT NOT NULL,
    "analysisJobId" TEXT,
    "traceId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisJobEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalysisJob_traceId_idx" ON "AnalysisJob"("traceId");

-- CreateIndex
CREATE INDEX "AnalysisJobEvent_analysisJobId_idx" ON "AnalysisJobEvent"("analysisJobId");

-- CreateIndex
CREATE INDEX "AnalysisJobEvent_traceId_idx" ON "AnalysisJobEvent"("traceId");

-- CreateIndex
CREATE INDEX "AnalysisJobEvent_analysisJobId_createdAt_idx" ON "AnalysisJobEvent"("analysisJobId", "createdAt");

-- CreateIndex
CREATE INDEX "AnalysisJobEvent_traceId_createdAt_idx" ON "AnalysisJobEvent"("traceId", "createdAt");

-- AddForeignKey
ALTER TABLE "AnalysisJobEvent" ADD CONSTRAINT "AnalysisJobEvent_analysisJobId_fkey" FOREIGN KEY ("analysisJobId") REFERENCES "AnalysisJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
