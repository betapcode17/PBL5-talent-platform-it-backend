-- AlterTable
ALTER TABLE "JobPostActivity" ADD COLUMN     "ai_concerns" JSONB,
ADD COLUMN     "ai_model" TEXT,
ADD COLUMN     "ai_raw_result" JSONB,
ADD COLUMN     "ai_recommendation" TEXT,
ADD COLUMN     "ai_score" DOUBLE PRECISION,
ADD COLUMN     "ai_screened_at" TIMESTAMP(3),
ADD COLUMN     "ai_screened_by_id" INTEGER,
ADD COLUMN     "ai_strengths" JSONB,
ADD COLUMN     "ai_summary" TEXT;
