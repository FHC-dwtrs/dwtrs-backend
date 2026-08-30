/*
  Warnings:

  - You are about to drop the `user_role` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `roleId` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "user_role" DROP CONSTRAINT "user_role_roleId_fkey";

-- DropForeignKey
ALTER TABLE "user_role" DROP CONSTRAINT "user_role_userId_fkey";

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "roleId" UUID NOT NULL;

-- DropTable
DROP TABLE "user_role";

-- CreateIndex
CREATE INDEX "user_roleId_idx" ON "user"("roleId");

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("roleId") ON DELETE RESTRICT ON UPDATE CASCADE;
