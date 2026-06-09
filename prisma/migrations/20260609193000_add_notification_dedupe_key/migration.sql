ALTER TABLE "Notification"
  ADD COLUMN "dedupe_key" TEXT;

CREATE INDEX "Notification_dedupe_key_idx"
  ON "Notification"("dedupe_key");
