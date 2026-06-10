CREATE TYPE "AiScreeningRunStatus" AS ENUM (
  'PENDING',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE "ai_screening_runs" (
  "id" SERIAL NOT NULL,
  "job_post_id" INTEGER NOT NULL,
  "employee_id" INTEGER NOT NULL,
  "company_id" INTEGER NOT NULL,
  "mode" TEXT NOT NULL,
  "limit" INTEGER NOT NULL,
  "force" BOOLEAN NOT NULL,
  "judge_top_n" INTEGER,
  "status" "AiScreeningRunStatus" NOT NULL DEFAULT 'PENDING',
  "total_count" INTEGER NOT NULL DEFAULT 0,
  "processed_count" INTEGER NOT NULL DEFAULT 0,
  "success_count" INTEGER NOT NULL DEFAULT 0,
  "failed_count" INTEGER NOT NULL DEFAULT 0,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ai_screening_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_screening_runs_status_created_at_idx"
  ON "ai_screening_runs"("status", "created_at");
CREATE INDEX "ai_screening_runs_company_id_idx"
  ON "ai_screening_runs"("company_id");
CREATE INDEX "ai_screening_runs_job_post_id_idx"
  ON "ai_screening_runs"("job_post_id");

ALTER TABLE "ai_screening_runs"
  ADD CONSTRAINT "ai_screening_runs_job_post_id_fkey"
  FOREIGN KEY ("job_post_id") REFERENCES "JobPost"("job_post_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_screening_runs"
  ADD CONSTRAINT "ai_screening_runs_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "Employee"("employee_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_screening_runs"
  ADD CONSTRAINT "ai_screening_runs_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "Company"("company_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
