ALTER TABLE "JobPostActivity"
ADD COLUMN IF NOT EXISTS "cover_letter" TEXT,
ADD COLUMN IF NOT EXISTS "cv_url" TEXT;

ALTER TABLE "JobPostActivity"
ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE INDEX IF NOT EXISTS "JobPostActivity_job_post_id_idx"
ON "JobPostActivity"("job_post_id");

CREATE INDEX IF NOT EXISTS "JobPostActivity_seeker_id_idx"
ON "JobPostActivity"("seeker_id");

CREATE INDEX IF NOT EXISTS "JobPostActivity_status_idx"
ON "JobPostActivity"("status");

CREATE UNIQUE INDEX IF NOT EXISTS "JobPostActivity_seeker_id_job_post_id_key"
ON "JobPostActivity"("seeker_id", "job_post_id");
