ALTER TABLE "ai_screening_runs"
  ADD COLUMN "total_duration_ms" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "extraction_duration_ms" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "scoring_duration_ms" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "judge_duration_ms" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "save_duration_ms" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "ai_screening_runs_one_active_per_job_idx"
  ON "ai_screening_runs"("job_post_id")
  WHERE "status" IN ('PENDING', 'RUNNING');
