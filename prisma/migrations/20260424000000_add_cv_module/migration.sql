-- CreateTable
CREATE TABLE "SeekerPersonality" (
    "personality_id" SERIAL NOT NULL,
    "seeker_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeekerPersonality_pkey" PRIMARY KEY ("personality_id")
);

-- CreateIndex
CREATE INDEX "SeekerPersonality_seeker_id_idx" ON "SeekerPersonality"("seeker_id");

-- AddForeignKey
ALTER TABLE "SeekerPersonality" ADD CONSTRAINT "SeekerPersonality_seeker_id_fkey" FOREIGN KEY ("seeker_id") REFERENCES "Seeker"("seeker_id") ON DELETE RESTRICT ON UPDATE CASCADE;
