-- CreateEnum
CREATE TYPE "InterviewType" AS ENUM ('VIDEO', 'PHONE', 'ONSITE');

-- CreateTable
CREATE TABLE "interviews" (
    "interview_id" SERIAL NOT NULL,
    "application_id" INTEGER NOT NULL,
    "seeker_id" INTEGER NOT NULL,
    "interviewer_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "type" "InterviewType" NOT NULL,
    "schedule" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "link" TEXT,
    "status" "InterviewStatus" NOT NULL DEFAULT 'SCHEDULED',
    "cancel_reason" TEXT,
    "feedback" TEXT,
    "rating" INTEGER,
    "offer" BOOLEAN NOT NULL DEFAULT false,
    "rescheduled_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interviews_pkey" PRIMARY KEY ("interview_id")
);

-- CreateIndex
CREATE INDEX "interviews_application_id_idx" ON "interviews"("application_id");

-- CreateIndex
CREATE INDEX "interviews_schedule_idx" ON "interviews"("schedule");

-- CreateIndex
CREATE INDEX "interviews_end_time_idx" ON "interviews"("end_time");

-- CreateIndex
CREATE INDEX "interviews_interviewer_id_idx" ON "interviews"("interviewer_id");

-- CreateIndex
CREATE INDEX "interviews_seeker_id_idx" ON "interviews"("seeker_id");

-- CreateIndex
CREATE INDEX "interviews_status_idx" ON "interviews"("status");

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "JobPostActivity"("application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "Seeker"("seeker_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_interviewer_id_fkey" FOREIGN KEY ("interviewer_id") REFERENCES "Employee"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interviews" ADD CONSTRAINT "interviews_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "Employee"("employee_id") ON DELETE RESTRICT ON UPDATE CASCADE;
