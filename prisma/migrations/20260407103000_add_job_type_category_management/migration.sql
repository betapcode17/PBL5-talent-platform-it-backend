ALTER TABLE "JobType"
ADD COLUMN "description" TEXT,
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Category"
ADD COLUMN "parent_category_id" INTEGER,
ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Category"
ADD CONSTRAINT "Category_parent_category_id_fkey"
FOREIGN KEY ("parent_category_id") REFERENCES "Category"("category_id")
ON DELETE SET NULL
ON UPDATE CASCADE;
