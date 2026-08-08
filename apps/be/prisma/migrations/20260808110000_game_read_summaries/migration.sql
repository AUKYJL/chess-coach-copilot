ALTER TABLE "Game"
ADD COLUMN "event" TEXT,
ADD COLUMN "site" TEXT,
ADD COLUMN "whitePlayerName" TEXT,
ADD COLUMN "blackPlayerName" TEXT,
ADD COLUMN "openingHeader" TEXT,
ADD COLUMN "ecoCode" TEXT,
ADD COLUMN "rawResult" TEXT,
ADD COLUMN "derivedResult" "GameResult" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "plyCount" INTEGER;

CREATE INDEX "Game_studentId_importedAt_idx" ON "Game"("studentId", "importedAt");
