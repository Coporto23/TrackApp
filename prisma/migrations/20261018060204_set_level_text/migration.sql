-- AlterTable
ALTER TABLE "Set" ADD COLUMN     "level" VARCHAR(10),
ALTER COLUMN "weight" DROP NOT NULL;


-- Series existentes con unidad "nivel": pasar el número a texto (5.00 -> "5", 5.50 -> "5.5").
UPDATE "Set"
SET "level" = TRIM(TRAILING '.' FROM TRIM(TRAILING '0' FROM "weight"::text)), "weight" = NULL
WHERE "weightUnit" = 'level' AND "weight" IS NOT NULL;
