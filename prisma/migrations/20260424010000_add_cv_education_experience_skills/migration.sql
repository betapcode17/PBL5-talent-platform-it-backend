-- CreateTable
CREATE TABLE "CvEducation" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "school" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "major" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvEducation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvExperience" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "company" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvSkill" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CvEducation_userId_idx" ON "CvEducation"("userId");

-- CreateIndex
CREATE INDEX "CvExperience_userId_idx" ON "CvExperience"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CvSkill_userId_name_key" ON "CvSkill"("userId", "name");

-- CreateIndex
CREATE INDEX "CvSkill_userId_idx" ON "CvSkill"("userId");

-- AddForeignKey
ALTER TABLE "CvEducation" ADD CONSTRAINT "CvEducation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Seeker"("seeker_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvExperience" ADD CONSTRAINT "CvExperience_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Seeker"("seeker_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvSkill" ADD CONSTRAINT "CvSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Seeker"("seeker_id") ON DELETE CASCADE ON UPDATE CASCADE;
