-- AlterTable
ALTER TABLE "attachment" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" UUID,
ADD COLUMN     "deletionReason" VARCHAR(1000);

-- AlterTable
ALTER TABLE "document" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedBy" UUID,
ADD COLUMN     "deletionReason" VARCHAR(1000);

-- CreateIndex
CREATE INDEX "attachment_deletedBy_idx" ON "attachment"("deletedBy");

-- CreateIndex
CREATE INDEX "attachment_deletedAt_idx" ON "attachment"("deletedAt");

-- CreateIndex
CREATE INDEX "document_deletedBy_idx" ON "document"("deletedBy");

-- CreateIndex
CREATE INDEX "document_deletedAt_idx" ON "document"("deletedAt");

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "user"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_deletedBy_fkey" FOREIGN KEY ("deletedBy") REFERENCES "user"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
