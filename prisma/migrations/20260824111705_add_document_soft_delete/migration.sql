-- DropIndex
DROP INDEX "attachment_deletedAt_idx";

-- DropIndex
DROP INDEX "document_deletedAt_idx";

-- CreateIndex
CREATE INDEX "attachment_documentId_deletedAt_idx" ON "attachment"("documentId", "deletedAt");

-- CreateIndex
CREATE INDEX "document_caseId_deletedAt_idx" ON "document"("caseId", "deletedAt");
