-- CreateEnum
CREATE TYPE "MistakeReviewStatus" AS ENUM ('UNREVIEWED', 'CONFIRMED', 'REJECTED');

-- AlterTable
ALTER TABLE "Mistake"
ADD COLUMN "coachNote" TEXT,
ADD COLUMN "reviewStatus" "MistakeReviewStatus" NOT NULL DEFAULT 'UNREVIEWED';
