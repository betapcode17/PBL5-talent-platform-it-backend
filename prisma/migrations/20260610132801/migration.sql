-- CreateEnum
CREATE TYPE "EmployerRegistrationRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Notification" ALTER COLUMN "updated_date" DROP DEFAULT;

-- CreateTable
CREATE TABLE "EmployerRegistrationRequest" (
    "request_id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joined_date" TIMESTAMP(3),
    "company_name" TEXT NOT NULL,
    "company_address" TEXT NOT NULL,
    "company_website_url" TEXT,
    "status" "EmployerRegistrationRequestStatus" NOT NULL DEFAULT 'PENDING',
    "review_note" TEXT,
    "company_id" INTEGER,
    "created_user_id" INTEGER,
    "generated_login_email" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployerRegistrationRequest_pkey" PRIMARY KEY ("request_id")
);

-- AddForeignKey
ALTER TABLE "EmployerRegistrationRequest" ADD CONSTRAINT "EmployerRegistrationRequest_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("company_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "job_ai_criteria_cache_job_post_id_job_document_hash_model_versi" RENAME TO "job_ai_criteria_cache_job_post_id_job_document_hash_model_v_key";
