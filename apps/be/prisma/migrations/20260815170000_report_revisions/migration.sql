DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReportSource') THEN
    CREATE TYPE "ReportSource" AS ENUM ('AI', 'MANUAL');
  END IF;
END $$;

ALTER TABLE "Report"
  ADD COLUMN IF NOT EXISTS "gameId" TEXT,
  ADD COLUMN IF NOT EXISTS "currentRevisionId" TEXT,
  ADD COLUMN IF NOT EXISTS "source" "ReportSource" NOT NULL DEFAULT 'AI';

ALTER TABLE "Report"
  ALTER COLUMN "analysisId" DROP NOT NULL,
  ALTER COLUMN "promptVersion" DROP NOT NULL,
  ALTER COLUMN "model" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "ReportRevision" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "analysisId" TEXT,
  "title" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "source" "ReportSource" NOT NULL,
  "promptVersion" TEXT,
  "model" TEXT,
  "version" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReportRevision_pkey" PRIMARY KEY ("id")
);

CREATE OR REPLACE FUNCTION "format_report_content_v1"("raw_content" JSONB)
RETURNS JSONB
LANGUAGE SQL
IMMUTABLE
AS $$
  WITH normalized AS (
    SELECT COALESCE("raw_content", '{}'::jsonb) AS content
  ),
  summary_section AS (
    SELECT CASE
      WHEN NULLIF(BTRIM(content ->> 'text'), '') IS NOT NULL
        THEN JSONB_BUILD_OBJECT('text', BTRIM(content ->> 'text'))
      WHEN NULLIF(BTRIM(content ->> 'summary'), '') IS NULL
        THEN NULL
      ELSE JSONB_BUILD_OBJECT(
        'text',
        BTRIM(
          CONCAT_WS(
            E'\n\n',
            E'Резюме\n' || BTRIM(content ->> 'summary'),
            CASE
              WHEN JSONB_TYPEOF(content -> 'highlights') = 'array'
                AND JSONB_ARRAY_LENGTH(content -> 'highlights') > 0
                THEN E'Ключевые моменты\n' || (
                  SELECT STRING_AGG('- ' || item.value, E'\n')
                  FROM JSONB_ARRAY_ELEMENTS_TEXT(content -> 'highlights') AS item(value)
                )
              ELSE NULL
            END,
            CASE
              WHEN JSONB_TYPEOF(content -> 'lessonFocus') = 'array'
                AND JSONB_ARRAY_LENGTH(content -> 'lessonFocus') > 0
                THEN E'Фокус урока\n' || (
                  SELECT STRING_AGG('- ' || item.value, E'\n')
                  FROM JSONB_ARRAY_ELEMENTS_TEXT(content -> 'lessonFocus') AS item(value)
                )
              ELSE NULL
            END,
            CASE
              WHEN JSONB_TYPEOF(content -> 'nextSteps') = 'array'
                AND JSONB_ARRAY_LENGTH(content -> 'nextSteps') > 0
                THEN E'Следующие шаги\n' || (
                  SELECT STRING_AGG('- ' || item.value, E'\n')
                  FROM JSONB_ARRAY_ELEMENTS_TEXT(content -> 'nextSteps') AS item(value)
                )
              ELSE NULL
            END
          )
        )
      )
    END AS content
    FROM normalized
  )
  SELECT COALESCE(
    (SELECT content FROM summary_section),
    JSONB_BUILD_OBJECT('text', COALESCE("raw_content"::text, ''))
  );
$$;

UPDATE "Report" AS report
SET "gameId" = analysis."gameId"
FROM "GameAnalysis" AS analysis
WHERE report."analysisId" = analysis."id"
  AND report."gameId" IS NULL;

CREATE TEMP TABLE "__report_canonical_map" AS
SELECT
  report."id" AS "reportId",
  FIRST_VALUE(report."id") OVER (
    PARTITION BY report."gameId", report."audience"
    ORDER BY report."updatedAt" DESC, report."createdAt" DESC, report."id" DESC
  ) AS "canonicalReportId"
FROM "Report" AS report
WHERE report."gameId" IS NOT NULL;

CREATE TEMP TABLE "__report_revision_source" AS
SELECT
  map."canonicalReportId",
  report."id" AS "sourceReportId",
  report."analysisId",
  report."title",
  "format_report_content_v1"(report."content") AS "content",
  report."promptVersion",
  report."model",
  report."createdAt",
  ROW_NUMBER() OVER (
    PARTITION BY map."canonicalReportId"
    ORDER BY report."createdAt" ASC, report."id" ASC
  ) AS "version"
FROM "Report" AS report
INNER JOIN "__report_canonical_map" AS map
  ON map."reportId" = report."id";

CREATE UNIQUE INDEX IF NOT EXISTS "ReportRevision_reportId_version_key" ON "ReportRevision"("reportId", "version");

INSERT INTO "ReportRevision" (
  "id",
  "reportId",
  "analysisId",
  "title",
  "content",
  "source",
  "promptVersion",
  "model",
  "version",
  "createdAt"
)
SELECT
  source."canonicalReportId" || '-rev-' || source."version",
  source."canonicalReportId",
  source."analysisId",
  source."title",
  source."content",
  'AI'::"ReportSource",
  source."promptVersion",
  source."model",
  source."version",
  source."createdAt"
FROM "__report_revision_source" AS source
ON CONFLICT ("reportId", "version") DO NOTHING;

UPDATE "Report" AS report
SET
  "analysisId" = canonical."analysisId",
  "title" = canonical."title",
  "content" = canonical."content",
  "source" = 'AI'::"ReportSource",
  "promptVersion" = canonical."promptVersion",
  "model" = canonical."model",
  "currentRevisionId" = canonical."canonicalReportId" || '-rev-' || canonical."version"
FROM "__report_revision_source" AS canonical
WHERE report."id" = canonical."canonicalReportId"
  AND canonical."sourceReportId" = canonical."canonicalReportId";

UPDATE "GenerationTrace" AS trace
SET "reportId" = map."canonicalReportId"
FROM "__report_canonical_map" AS map
WHERE trace."reportId" = map."reportId"
  AND map."reportId" <> map."canonicalReportId";

DELETE FROM "Report" AS report
USING "__report_canonical_map" AS map
WHERE report."id" = map."reportId"
  AND map."reportId" <> map."canonicalReportId";

CREATE INDEX IF NOT EXISTS "Report_gameId_idx" ON "Report"("gameId");
CREATE INDEX IF NOT EXISTS "Report_currentRevisionId_idx" ON "Report"("currentRevisionId");
CREATE UNIQUE INDEX IF NOT EXISTS "Report_gameId_audience_key" ON "Report"("gameId", "audience");
CREATE INDEX IF NOT EXISTS "ReportRevision_reportId_idx" ON "ReportRevision"("reportId");
CREATE INDEX IF NOT EXISTS "ReportRevision_analysisId_idx" ON "ReportRevision"("analysisId");
CREATE UNIQUE INDEX IF NOT EXISTS "ReportRevision_reportId_version_key" ON "ReportRevision"("reportId", "version");

ALTER TABLE "Report" DROP CONSTRAINT IF EXISTS "Report_analysisId_fkey";
ALTER TABLE "Report"
  ADD CONSTRAINT "Report_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "GameAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Report_gameId_fkey'
  ) THEN
    ALTER TABLE "Report"
      ADD CONSTRAINT "Report_gameId_fkey"
      FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Report_currentRevisionId_fkey'
  ) THEN
    ALTER TABLE "Report"
      ADD CONSTRAINT "Report_currentRevisionId_fkey"
      FOREIGN KEY ("currentRevisionId") REFERENCES "ReportRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ReportRevision_reportId_fkey'
  ) THEN
    ALTER TABLE "ReportRevision"
      ADD CONSTRAINT "ReportRevision_reportId_fkey"
      FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ReportRevision_analysisId_fkey'
  ) THEN
    ALTER TABLE "ReportRevision"
      ADD CONSTRAINT "ReportRevision_analysisId_fkey"
      FOREIGN KEY ("analysisId") REFERENCES "GameAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DROP FUNCTION IF EXISTS "format_report_content_v1"(JSONB);
