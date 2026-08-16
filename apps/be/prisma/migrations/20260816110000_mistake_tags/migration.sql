ALTER TABLE "Mistake"
ADD COLUMN     "mainTag" "WeaknessTag",
ADD COLUMN     "secondaryTags" "WeaknessTag"[] DEFAULT ARRAY[]::"WeaknessTag"[];

UPDATE "Mistake"
SET "secondaryTags" = ARRAY[]::"WeaknessTag"[]
WHERE "secondaryTags" IS NULL;

ALTER TABLE "Mistake"
ALTER COLUMN "secondaryTags" SET NOT NULL;
