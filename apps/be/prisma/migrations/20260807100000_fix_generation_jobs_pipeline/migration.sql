-- CreateEnum
CREATE TYPE "ReportAudience" AS ENUM ('COACH', 'PARENT');

-- AlterEnum
ALTER TYPE "AnalysisJobStatus" RENAME VALUE 'REPORT_GENERATION' TO 'GENERATING_OUTPUT';

-- AlterTable
ALTER TABLE "AnalysisJob"
ADD COLUMN "sourceAnalysisId" TEXT,
ADD COLUMN "reportAudience" "ReportAudience";

-- AlterTable
ALTER TABLE "Report"
ALTER COLUMN "audience" TYPE "ReportAudience" USING "audience"::"ReportAudience";
