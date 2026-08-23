/*
  Warnings:

  - You are about to drop the column `versionId` on the `attachment` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `case` table. All the data in the column will be lost.
  - You are about to drop the `document_version` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `documentId` to the `attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uploadedBy` to the `attachment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileName` to the `document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileSize` to the `document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storageKey` to the `document` table without a default value. This is not possible if the table is not empty.
  - Added the required column `uploadedBy` to the `document` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "attachment" DROP CONSTRAINT "attachment_versionId_fkey";

-- DropForeignKey
ALTER TABLE "document_version" DROP CONSTRAINT "document_version_createdBy_fkey";

-- DropForeignKey
ALTER TABLE "document_version" DROP CONSTRAINT "document_version_documentId_fkey";

-- DropIndex
DROP INDEX "attachment_versionId_idx";

-- AlterTable
ALTER TABLE "attachment" DROP COLUMN "versionId",
ADD COLUMN     "documentId" UUID NOT NULL,
ADD COLUMN     "uploadedBy" UUID NOT NULL;

-- AlterTable
ALTER TABLE "case" DROP COLUMN "version";

-- AlterTable
ALTER TABLE "document" ADD COLUMN     "checksum" VARCHAR(128),
ADD COLUMN     "fileName" VARCHAR(255) NOT NULL,
ADD COLUMN     "fileSize" BIGINT NOT NULL,
ADD COLUMN     "mimeType" VARCHAR(100) NOT NULL,
ADD COLUMN     "storageKey" VARCHAR(500) NOT NULL,
ADD COLUMN     "uploadedBy" UUID NOT NULL;

-- DropTable
DROP TABLE "document_version";

-- CreateIndex
CREATE INDEX "attachment_documentId_idx" ON "attachment"("documentId");

-- CreateIndex
CREATE INDEX "attachment_uploadedBy_idx" ON "attachment"("uploadedBy");

-- CreateIndex
CREATE INDEX "document_uploadedBy_idx" ON "document"("uploadedBy");

-- CreateIndex
CREATE INDEX "document_checksum_idx" ON "document"("checksum");

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "user"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document"("documentId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "user"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
