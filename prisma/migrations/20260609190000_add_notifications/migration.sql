CREATE TYPE "NotificationRole" AS ENUM ('ADMIN', 'SEEKER', 'EMPLOYEE');

CREATE TYPE "NotificationType" AS ENUM (
  'USER_REGISTERED',
  'EMPLOYER_REGISTRATION_SUBMITTED',
  'EMPLOYER_REGISTRATION_APPROVED',
  'EMPLOYER_REGISTRATION_REJECTED',
  'JOB_CREATED',
  'JOB_REVIEW_REQUIRED',
  'REPORT_SUBMITTED',
  'APPLICATION_SUBMITTED',
  'APPLICATION_ACCEPTED',
  'APPLICATION_REJECTED',
  'CV_VIEWED',
  'JOB_RECOMMENDED',
  'COMPANY_REPLIED',
  'JOB_BOOKMARKED',
  'JOB_APPROVED',
  'JOB_REJECTED',
  'SEEKER_MESSAGE',
  'INTERVIEW_SCHEDULED',
  'INTERVIEW_RESCHEDULED',
  'INTERVIEW_CANCELLED',
  'INTERVIEW_COMPLETED',
  'JOB_EXPIRING'
);

CREATE TABLE "Notification" (
  "notification_id" SERIAL NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "role" "NotificationRole" NOT NULL,
  "receiver_id" INTEGER NOT NULL,
  "sender_id" INTEGER,
  "is_read" BOOLEAN NOT NULL DEFAULT false,
  "read_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Notification_pkey" PRIMARY KEY ("notification_id")
);

CREATE INDEX "Notification_receiver_id_is_read_created_date_idx"
  ON "Notification"("receiver_id", "is_read", "created_date" DESC);

CREATE INDEX "Notification_role_created_date_idx"
  ON "Notification"("role", "created_date" DESC);

CREATE INDEX "Notification_type_created_date_idx"
  ON "Notification"("type", "created_date" DESC);

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_receiver_id_fkey"
  FOREIGN KEY ("receiver_id") REFERENCES "User"("user_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_sender_id_fkey"
  FOREIGN KEY ("sender_id") REFERENCES "User"("user_id")
  ON DELETE SET NULL ON UPDATE CASCADE;
