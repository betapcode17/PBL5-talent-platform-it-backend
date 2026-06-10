CREATE TABLE "job_ai_criteria_cache" (
  "id" SERIAL NOT NULL,
  "job_post_id" INTEGER NOT NULL,
  "job_document_hash" TEXT NOT NULL,
  "model_version" TEXT NOT NULL,
  "prompt_version" TEXT NOT NULL,
  "job_criteria" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "job_ai_criteria_cache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_ai_criteria_cache_job_post_id_job_document_hash_model_version_prompt_version_key"
  ON "job_ai_criteria_cache"("job_post_id", "job_document_hash", "model_version", "prompt_version");
CREATE INDEX "job_ai_criteria_cache_job_post_id_idx"
  ON "job_ai_criteria_cache"("job_post_id");

ALTER TABLE "job_ai_criteria_cache"
  ADD CONSTRAINT "job_ai_criteria_cache_job_post_id_fkey"
  FOREIGN KEY ("job_post_id") REFERENCES "JobPost"("job_post_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
