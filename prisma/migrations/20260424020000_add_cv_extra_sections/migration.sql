-- CreateTable
CREATE TABLE "CvPersonality" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvPersonality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvCertificate" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issuedDate" TIMESTAMP(3),
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CvProject" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "link" TEXT,
    "role" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CvProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CvPersonality_userId_idx" ON "CvPersonality"("userId");

-- CreateIndex
CREATE INDEX "CvCertificate_userId_idx" ON "CvCertificate"("userId");

-- CreateIndex
CREATE INDEX "CvProject_userId_idx" ON "CvProject"("userId");

-- AddForeignKey
ALTER TABLE "CvPersonality" ADD CONSTRAINT "CvPersonality_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Seeker"("seeker_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvCertificate" ADD CONSTRAINT "CvCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Seeker"("seeker_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CvProject" ADD CONSTRAINT "CvProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Seeker"("seeker_id") ON DELETE CASCADE ON UPDATE CASCADE;
