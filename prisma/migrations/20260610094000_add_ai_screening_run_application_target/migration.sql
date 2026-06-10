ALTER TABLE "ai_screening_runs"
ADD COLUMN "application_id" INTEGER;

CREATE INDEX "ai_screening_runs_application_id_idx"
ON "ai_screening_runs"("application_id");
