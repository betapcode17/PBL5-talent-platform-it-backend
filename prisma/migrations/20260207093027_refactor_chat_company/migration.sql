/*
  Warnings:

  - You are about to drop the column `employee_id` on the `Chat` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[seeker_id,company_id]` on the table `Chat` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `company_id` to the `Chat` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `sender_type` on the `Message` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('SEEKER', 'EMPLOYEE');

-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_employee_id_fkey";

-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "employee_id",
ADD COLUMN     "company_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "sender_type",
ADD COLUMN     "sender_type" "SenderType" NOT NULL;

-- CreateIndex
CREATE INDEX "Chat_company_id_idx" ON "Chat"("company_id");

-- CreateIndex
CREATE INDEX "Chat_seeker_id_idx" ON "Chat"("seeker_id");

-- CreateIndex
CREATE UNIQUE INDEX "Chat_seeker_id_company_id_key" ON "Chat"("seeker_id", "company_id");

-- CreateIndex
CREATE INDEX "Message_chat_id_idx" ON "Message"("chat_id");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("company_id") ON DELETE RESTRICT ON UPDATE CASCADE;
