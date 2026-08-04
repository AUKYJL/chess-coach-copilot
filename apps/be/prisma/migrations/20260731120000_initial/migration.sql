-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CoachAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ExternalPlatform" AS ENUM ('LICHESS', 'CHESS_COM');

-- CreateEnum
CREATE TYPE "GameSourceType" AS ENUM ('MANUAL_PGN', 'LICHESS_IMPORT');

-- CreateEnum
CREATE TYPE "StudentColor" AS ENUM ('WHITE', 'BLACK');

-- CreateEnum
CREATE TYPE "AnnotationCoverage" AS ENUM ('FULL', 'PARTIAL', 'NONE');

-- CreateEnum
CREATE TYPE "AnalysisJobType" AS ENUM ('ANALYSIS', 'REPORT_GENERATION', 'HOMEWORK_GENERATION', 'PROGRESS_GENERATION');

-- CreateEnum
CREATE TYPE "AnalysisJobStatus" AS ENUM ('PENDING', 'PARSING', 'EXTRACTING_ANNOTATIONS', 'CLASSIFICATION', 'REPORT_GENERATION', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "GameResult" AS ENUM ('WIN', 'LOSS', 'DRAW', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "MomentSeverity" AS ENUM ('INACCURACY', 'MISTAKE', 'BLUNDER', 'MATE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "CoachAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "CoachAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "coachAccountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedByTokenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "coachAccountId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "birthYear" INTEGER,
    "rating" INTEGER,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalAccount" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "platform" "ExternalPlatform" NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "coachAccountId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sourceType" "GameSourceType" NOT NULL,
    "sourceLabel" TEXT,
    "studentColor" "StudentColor" NOT NULL,
    "rawPgn" TEXT NOT NULL,
    "normalizedPgnHash" TEXT NOT NULL,
    "hasEngineAnnotations" BOOLEAN NOT NULL DEFAULT false,
    "annotationCoverage" "AnnotationCoverage" NOT NULL DEFAULT 'NONE',
    "reducedConfidenceWarning" TEXT,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisJob" (
    "id" TEXT NOT NULL,
    "coachAccountId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "jobType" "AnalysisJobType" NOT NULL,
    "status" "AnalysisJobStatus" NOT NULL DEFAULT 'PENDING',
    "queueName" TEXT NOT NULL,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "progressPercent" INTEGER,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastRetriedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalysisJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameAnalysis" (
    "id" TEXT NOT NULL,
    "coachAccountId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "analysisJobId" TEXT NOT NULL,
    "resultVersion" INTEGER NOT NULL DEFAULT 1,
    "confidenceLevel" "ConfidenceLevel" NOT NULL,
    "overallDiagnosis" TEXT NOT NULL,
    "openingName" TEXT,
    "result" "GameResult" NOT NULL DEFAULT 'UNKNOWN',
    "mainWeaknessTag" TEXT,
    "secondaryWeaknessTags" JSONB NOT NULL,
    "recommendedLessonTitle" TEXT,
    "recommendedLessonWhy" TEXT,
    "recommendedFocusPoints" JSONB NOT NULL,
    "rawExtractedContext" JSONB NOT NULL,
    "rawAnalysisJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CriticalMoment" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "moveNumber" TEXT NOT NULL,
    "movePlayed" TEXT NOT NULL,
    "bestMove" TEXT,
    "fen" TEXT,
    "evaluationBefore" TEXT,
    "evaluationAfter" TEXT,
    "evalChange" TEXT,
    "severity" "MomentSeverity" NOT NULL DEFAULT 'UNKNOWN',
    "mainTag" TEXT NOT NULL,
    "secondaryTags" JSONB NOT NULL,
    "confidence" DECIMAL(5,4) NOT NULL,
    "whatHappened" TEXT NOT NULL,
    "studentExplanation" TEXT NOT NULL,
    "coachNote" TEXT NOT NULL,
    "trainingTheme" TEXT,
    "sourceEvidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CriticalMoment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mistake" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "moveNumber" TEXT NOT NULL,
    "movePlayed" TEXT NOT NULL,
    "bestMove" TEXT,
    "severity" "MomentSeverity" NOT NULL DEFAULT 'UNKNOWN',
    "category" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "suggestedFix" TEXT,
    "sourceEvidence" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mistake_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "coachAccountId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Homework" (
    "id" TEXT NOT NULL,
    "coachAccountId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Homework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressSnapshot" (
    "id" TEXT NOT NULL,
    "coachAccountId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "analysisCount" INTEGER NOT NULL,
    "summary" JSONB NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationTrace" (
    "id" TEXT NOT NULL,
    "coachAccountId" TEXT NOT NULL,
    "analysisJobId" TEXT,
    "analysisId" TEXT,
    "reportId" TEXT,
    "homeworkId" TEXT,
    "progressSnapshotId" TEXT,
    "promptVersion" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputPayload" JSONB NOT NULL,
    "outputPayload" JSONB NOT NULL,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationTrace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CoachAccount_email_key" ON "CoachAccount"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_coachAccountId_idx" ON "RefreshToken"("coachAccountId");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE INDEX "Student_coachAccountId_idx" ON "Student"("coachAccountId");

-- CreateIndex
CREATE INDEX "ExternalAccount_studentId_idx" ON "ExternalAccount"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalAccount_studentId_platform_username_key" ON "ExternalAccount"("studentId", "platform", "username");

-- CreateIndex
CREATE INDEX "Game_coachAccountId_idx" ON "Game"("coachAccountId");

-- CreateIndex
CREATE INDEX "Game_studentId_idx" ON "Game"("studentId");

-- CreateIndex
CREATE INDEX "Game_studentId_normalizedPgnHash_idx" ON "Game"("studentId", "normalizedPgnHash");

-- CreateIndex
CREATE INDEX "AnalysisJob_coachAccountId_idx" ON "AnalysisJob"("coachAccountId");

-- CreateIndex
CREATE INDEX "AnalysisJob_studentId_idx" ON "AnalysisJob"("studentId");

-- CreateIndex
CREATE INDEX "AnalysisJob_gameId_idx" ON "AnalysisJob"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameAnalysis_analysisJobId_key" ON "GameAnalysis"("analysisJobId");

-- CreateIndex
CREATE INDEX "GameAnalysis_coachAccountId_idx" ON "GameAnalysis"("coachAccountId");

-- CreateIndex
CREATE INDEX "GameAnalysis_studentId_idx" ON "GameAnalysis"("studentId");

-- CreateIndex
CREATE INDEX "GameAnalysis_gameId_idx" ON "GameAnalysis"("gameId");

-- CreateIndex
CREATE INDEX "CriticalMoment_analysisId_idx" ON "CriticalMoment"("analysisId");

-- CreateIndex
CREATE INDEX "Mistake_analysisId_idx" ON "Mistake"("analysisId");

-- CreateIndex
CREATE INDEX "Report_coachAccountId_idx" ON "Report"("coachAccountId");

-- CreateIndex
CREATE INDEX "Report_studentId_idx" ON "Report"("studentId");

-- CreateIndex
CREATE INDEX "Report_analysisId_idx" ON "Report"("analysisId");

-- CreateIndex
CREATE INDEX "Homework_coachAccountId_idx" ON "Homework"("coachAccountId");

-- CreateIndex
CREATE INDEX "Homework_studentId_idx" ON "Homework"("studentId");

-- CreateIndex
CREATE INDEX "Homework_analysisId_idx" ON "Homework"("analysisId");

-- CreateIndex
CREATE INDEX "ProgressSnapshot_coachAccountId_idx" ON "ProgressSnapshot"("coachAccountId");

-- CreateIndex
CREATE INDEX "ProgressSnapshot_studentId_idx" ON "ProgressSnapshot"("studentId");

-- CreateIndex
CREATE INDEX "GenerationTrace_coachAccountId_idx" ON "GenerationTrace"("coachAccountId");

-- CreateIndex
CREATE INDEX "GenerationTrace_analysisJobId_idx" ON "GenerationTrace"("analysisJobId");

-- CreateIndex
CREATE INDEX "GenerationTrace_analysisId_idx" ON "GenerationTrace"("analysisId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_coachAccountId_fkey" FOREIGN KEY ("coachAccountId") REFERENCES "CoachAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_coachAccountId_fkey" FOREIGN KEY ("coachAccountId") REFERENCES "CoachAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalAccount" ADD CONSTRAINT "ExternalAccount_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_coachAccountId_fkey" FOREIGN KEY ("coachAccountId") REFERENCES "CoachAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisJob" ADD CONSTRAINT "AnalysisJob_coachAccountId_fkey" FOREIGN KEY ("coachAccountId") REFERENCES "CoachAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisJob" ADD CONSTRAINT "AnalysisJob_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisJob" ADD CONSTRAINT "AnalysisJob_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAnalysis" ADD CONSTRAINT "GameAnalysis_coachAccountId_fkey" FOREIGN KEY ("coachAccountId") REFERENCES "CoachAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAnalysis" ADD CONSTRAINT "GameAnalysis_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAnalysis" ADD CONSTRAINT "GameAnalysis_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameAnalysis" ADD CONSTRAINT "GameAnalysis_analysisJobId_fkey" FOREIGN KEY ("analysisJobId") REFERENCES "AnalysisJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CriticalMoment" ADD CONSTRAINT "CriticalMoment_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "GameAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mistake" ADD CONSTRAINT "Mistake_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "GameAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_coachAccountId_fkey" FOREIGN KEY ("coachAccountId") REFERENCES "CoachAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "GameAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_coachAccountId_fkey" FOREIGN KEY ("coachAccountId") REFERENCES "CoachAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Homework" ADD CONSTRAINT "Homework_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "GameAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressSnapshot" ADD CONSTRAINT "ProgressSnapshot_coachAccountId_fkey" FOREIGN KEY ("coachAccountId") REFERENCES "CoachAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressSnapshot" ADD CONSTRAINT "ProgressSnapshot_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationTrace" ADD CONSTRAINT "GenerationTrace_coachAccountId_fkey" FOREIGN KEY ("coachAccountId") REFERENCES "CoachAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationTrace" ADD CONSTRAINT "GenerationTrace_analysisJobId_fkey" FOREIGN KEY ("analysisJobId") REFERENCES "AnalysisJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationTrace" ADD CONSTRAINT "GenerationTrace_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "GameAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationTrace" ADD CONSTRAINT "GenerationTrace_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationTrace" ADD CONSTRAINT "GenerationTrace_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationTrace" ADD CONSTRAINT "GenerationTrace_progressSnapshotId_fkey" FOREIGN KEY ("progressSnapshotId") REFERENCES "ProgressSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
