CREATE INDEX "AnalysisJob_gameId_createdAt_idx"
ON "AnalysisJob"("gameId", "createdAt");

CREATE INDEX "AnalysisJob_studentId_createdAt_idx"
ON "AnalysisJob"("studentId", "createdAt");

CREATE INDEX "GameAnalysis_studentId_createdAt_idx"
ON "GameAnalysis"("studentId", "createdAt");

CREATE INDEX "GenerationTrace_analysisJobId_createdAt_idx"
ON "GenerationTrace"("analysisJobId", "createdAt");

CREATE INDEX "Game_studentId_importedAt_createdAt_idx"
ON "Game"("studentId", "importedAt", "createdAt");
