-- CreateEnum
CREATE TYPE "CaseStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'PENDING_CLARIFICATION', 'SENT_BACK_FOR_CORRECTION', 'APPROVED', 'REJECTED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('SECTOR', 'DIRECTORATE', 'GROUP');

-- CreateEnum
CREATE TYPE "DecisionType" AS ENUM ('APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "customer" (
    "customerId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30) NOT NULL,
    "email" VARCHAR(255),
    "address" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_pkey" PRIMARY KEY ("customerId")
);

-- CreateTable
CREATE TABLE "case" (
    "caseId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "trackingNumber" VARCHAR(50) NOT NULL,
    "incomingReferenceNo" VARCHAR(100),
    "subject" VARCHAR(500) NOT NULL,
    "status" "CaseStatus" NOT NULL DEFAULT 'SUBMITTED',
    "currentUnitId" UUID,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "case_pkey" PRIMARY KEY ("caseId")
);

-- CreateTable
CREATE TABLE "document" (
    "documentId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "documentType" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_pkey" PRIMARY KEY ("documentId")
);

-- CreateTable
CREATE TABLE "document_version" (
    "versionId" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_version_pkey" PRIMARY KEY ("versionId")
);

-- CreateTable
CREATE TABLE "attachment" (
    "attachmentId" UUID NOT NULL,
    "versionId" UUID NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "storageKey" VARCHAR(500) NOT NULL,
    "mimeType" VARCHAR(100) NOT NULL,
    "fileSize" BIGINT NOT NULL,
    "checksum" VARCHAR(128),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachment_pkey" PRIMARY KEY ("attachmentId")
);

-- CreateTable
CREATE TABLE "organizational_unit" (
    "unitId" UUID NOT NULL,
    "parentUnitId" UUID,
    "name" VARCHAR(150) NOT NULL,
    "unitType" "UnitType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizational_unit_pkey" PRIMARY KEY ("unitId")
);

-- CreateTable
CREATE TABLE "user" (
    "userId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "role" (
    "roleId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_pkey" PRIMARY KEY ("roleId")
);

-- CreateTable
CREATE TABLE "permission" (
    "permissionId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" VARCHAR(500),
    "resource" VARCHAR(100) NOT NULL,
    "action" VARCHAR(100) NOT NULL,

    CONSTRAINT "permission_pkey" PRIMARY KEY ("permissionId")
);

-- CreateTable
CREATE TABLE "user_role" (
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "role_permission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,

    CONSTRAINT "role_permission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "workflow_assignment" (
    "assignmentId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "fromUnitId" UUID,
    "toUnitId" UUID NOT NULL,
    "assignedBy" UUID NOT NULL,
    "assignmentStatus" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "remarks" VARCHAR(1000),
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "workflow_assignment_pkey" PRIMARY KEY ("assignmentId")
);

-- CreateTable
CREATE TABLE "status_history" (
    "statusHistoryId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "changedBy" UUID NOT NULL,
    "status" "CaseStatus" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_history_pkey" PRIMARY KEY ("statusHistoryId")
);

-- CreateTable
CREATE TABLE "remark" (
    "remarkId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "assignmentId" UUID,
    "remarkText" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remark_pkey" PRIMARY KEY ("remarkId")
);

-- CreateTable
CREATE TABLE "decision" (
    "decisionId" UUID NOT NULL,
    "caseId" UUID NOT NULL,
    "decidedBy" UUID NOT NULL,
    "decisionType" "DecisionType" NOT NULL,
    "decisionText" VARCHAR(2000),
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "decision_pkey" PRIMARY KEY ("decisionId")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "auditLogId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "caseId" UUID,
    "action" VARCHAR(100) NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" VARCHAR(100) NOT NULL,
    "oldValues" JSONB,
    "newValues" JSONB,
    "ipAddress" VARCHAR(45),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("auditLogId")
);

-- CreateTable
CREATE TABLE "notification" (
    "notificationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "caseId" UUID,
    "notificationType" VARCHAR(100) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "notification_pkey" PRIMARY KEY ("notificationId")
);

-- CreateIndex
CREATE INDEX "customer_phone_idx" ON "customer"("phone");

-- CreateIndex
CREATE INDEX "customer_email_idx" ON "customer"("email");

-- CreateIndex
CREATE UNIQUE INDEX "case_trackingNumber_key" ON "case"("trackingNumber");

-- CreateIndex
CREATE INDEX "case_customerId_idx" ON "case"("customerId");

-- CreateIndex
CREATE INDEX "case_incomingReferenceNo_idx" ON "case"("incomingReferenceNo");

-- CreateIndex
CREATE INDEX "case_currentUnitId_idx" ON "case"("currentUnitId");

-- CreateIndex
CREATE INDEX "case_status_idx" ON "case"("status");

-- CreateIndex
CREATE INDEX "case_submittedAt_idx" ON "case"("submittedAt");

-- CreateIndex
CREATE INDEX "document_caseId_idx" ON "document"("caseId");

-- CreateIndex
CREATE INDEX "document_version_createdBy_idx" ON "document_version"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "document_version_documentId_versionNumber_key" ON "document_version"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "attachment_versionId_idx" ON "attachment"("versionId");

-- CreateIndex
CREATE INDEX "attachment_checksum_idx" ON "attachment"("checksum");

-- CreateIndex
CREATE INDEX "organizational_unit_parentUnitId_idx" ON "organizational_unit"("parentUnitId");

-- CreateIndex
CREATE INDEX "organizational_unit_unitType_idx" ON "organizational_unit"("unitType");

-- CreateIndex
CREATE INDEX "organizational_unit_isActive_idx" ON "organizational_unit"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "user_unitId_idx" ON "user"("unitId");

-- CreateIndex
CREATE INDEX "user_isActive_idx" ON "user"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "role_name_key" ON "role"("name");

-- CreateIndex
CREATE INDEX "role_isActive_idx" ON "role"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "permission_name_key" ON "permission"("name");

-- CreateIndex
CREATE INDEX "permission_resource_idx" ON "permission"("resource");

-- CreateIndex
CREATE INDEX "permission_action_idx" ON "permission"("action");

-- CreateIndex
CREATE INDEX "user_role_roleId_idx" ON "user_role"("roleId");

-- CreateIndex
CREATE INDEX "role_permission_permissionId_idx" ON "role_permission"("permissionId");

-- CreateIndex
CREATE INDEX "workflow_assignment_caseId_idx" ON "workflow_assignment"("caseId");

-- CreateIndex
CREATE INDEX "workflow_assignment_fromUnitId_idx" ON "workflow_assignment"("fromUnitId");

-- CreateIndex
CREATE INDEX "workflow_assignment_toUnitId_idx" ON "workflow_assignment"("toUnitId");

-- CreateIndex
CREATE INDEX "workflow_assignment_assignedBy_idx" ON "workflow_assignment"("assignedBy");

-- CreateIndex
CREATE INDEX "workflow_assignment_assignmentStatus_idx" ON "workflow_assignment"("assignmentStatus");

-- CreateIndex
CREATE INDEX "workflow_assignment_assignedAt_idx" ON "workflow_assignment"("assignedAt");

-- CreateIndex
CREATE INDEX "status_history_caseId_idx" ON "status_history"("caseId");

-- CreateIndex
CREATE INDEX "status_history_changedBy_idx" ON "status_history"("changedBy");

-- CreateIndex
CREATE INDEX "status_history_status_idx" ON "status_history"("status");

-- CreateIndex
CREATE INDEX "status_history_changedAt_idx" ON "status_history"("changedAt");

-- CreateIndex
CREATE INDEX "remark_caseId_idx" ON "remark"("caseId");

-- CreateIndex
CREATE INDEX "remark_userId_idx" ON "remark"("userId");

-- CreateIndex
CREATE INDEX "remark_assignmentId_idx" ON "remark"("assignmentId");

-- CreateIndex
CREATE INDEX "decision_caseId_idx" ON "decision"("caseId");

-- CreateIndex
CREATE INDEX "decision_decidedBy_idx" ON "decision"("decidedBy");

-- CreateIndex
CREATE INDEX "decision_decisionType_idx" ON "decision"("decisionType");

-- CreateIndex
CREATE INDEX "decision_decidedAt_idx" ON "decision"("decidedAt");

-- CreateIndex
CREATE INDEX "audit_log_userId_idx" ON "audit_log"("userId");

-- CreateIndex
CREATE INDEX "audit_log_caseId_idx" ON "audit_log"("caseId");

-- CreateIndex
CREATE INDEX "audit_log_entityType_entityId_idx" ON "audit_log"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "notification_userId_isRead_idx" ON "notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notification_caseId_idx" ON "notification"("caseId");

-- CreateIndex
CREATE INDEX "notification_createdAt_idx" ON "notification"("createdAt");

-- AddForeignKey
ALTER TABLE "case" ADD CONSTRAINT "case_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customer"("customerId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case" ADD CONSTRAINT "case_currentUnitId_fkey" FOREIGN KEY ("currentUnitId") REFERENCES "organizational_unit"("unitId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "case"("caseId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_version" ADD CONSTRAINT "document_version_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "document"("documentId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_version" ADD CONSTRAINT "document_version_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "user"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachment" ADD CONSTRAINT "attachment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "document_version"("versionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizational_unit" ADD CONSTRAINT "organizational_unit_parentUnitId_fkey" FOREIGN KEY ("parentUnitId") REFERENCES "organizational_unit"("unitId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "organizational_unit"("unitId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role" ADD CONSTRAINT "user_role_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("roleId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "role"("roleId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permission" ADD CONSTRAINT "role_permission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permission"("permissionId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_assignment" ADD CONSTRAINT "workflow_assignment_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "case"("caseId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_assignment" ADD CONSTRAINT "workflow_assignment_fromUnitId_fkey" FOREIGN KEY ("fromUnitId") REFERENCES "organizational_unit"("unitId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_assignment" ADD CONSTRAINT "workflow_assignment_toUnitId_fkey" FOREIGN KEY ("toUnitId") REFERENCES "organizational_unit"("unitId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_assignment" ADD CONSTRAINT "workflow_assignment_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "user"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "case"("caseId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "user"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remark" ADD CONSTRAINT "remark_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "case"("caseId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remark" ADD CONSTRAINT "remark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remark" ADD CONSTRAINT "remark_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "workflow_assignment"("assignmentId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision" ADD CONSTRAINT "decision_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "case"("caseId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision" ADD CONSTRAINT "decision_decidedBy_fkey" FOREIGN KEY ("decidedBy") REFERENCES "user"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "case"("caseId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "case"("caseId") ON DELETE SET NULL ON UPDATE CASCADE;
