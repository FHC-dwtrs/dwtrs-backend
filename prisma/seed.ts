import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const roles = [
  {
    name: "SYSTEM_ADMIN",
    description:
      "System administrator with system-level administration privileges.",
  },
  {
    name: "RECORDS_ARCHIVE_STAFF",
    description:
      "Records and Archive staff responsible for case intake, registration, document handling, and initial routing.",
  },
  {
    name: "SECTOR_STAFF",
    description:
      "Sector staff responsible for processing cases assigned to their sector.",
  },
  {
    name: "DIRECTORATE_STAFF",
    description:
      "Directorate staff responsible for processing cases assigned to their directorate.",
  },
  {
    name: "GROUP_STAFF",
    description:
      "Group staff responsible for processing cases assigned to their group.",
  },
];

/**
 * Role → Permission mapping
 */
const rolePermissions: Record<string, string[]> = {
  SYSTEM_ADMIN: [
    "CASE_VIEW",
    "CUSTOMER_VIEW",
    "DOCUMENT_VIEW",
    "ATTACHMENT_VIEW",
    "WORKFLOW_VIEW",
    "STATUS_HISTORY_VIEW",
    "AUDIT_VIEW",
    "AUDIT_EXPORT",
    "NOTIFICATION_VIEW",
    "NOTIFICATION_MARK_READ",

    "USER_CREATE",
    "USER_VIEW",
    "USER_UPDATE",
    "USER_ACTIVATE",
    "USER_DEACTIVATE",
    "USER_ASSIGN_ROLE",
    "USER_REMOVE_ROLE",

    "UNIT_CREATE",
    "UNIT_VIEW",
    "UNIT_UPDATE",
    "UNIT_ACTIVATE",
    "UNIT_DEACTIVATE",

    "ROLE_VIEW",
    "ROLE_ASSIGN_PERMISSION",
    "ROLE_REMOVE_PERMISSION",

    "PERMISSION_VIEW",

    "REPORT_VIEW",
    "REPORT_GENERATE",
    "REPORT_EXPORT",
  ],

  RECORDS_ARCHIVE_STAFF: [
    "CASE_CREATE",
    "CASE_VIEW",
    "CASE_UPDATE",
    "CASE_ASSIGN",
    "CASE_REASSIGN",
    "CASE_RETURN",
    "CASE_CHANGE_STATUS",

    "CUSTOMER_CREATE",
    "CUSTOMER_VIEW",
    "CUSTOMER_UPDATE",

    "DOCUMENT_CREATE",
    "DOCUMENT_VIEW",
    "DOCUMENT_UPDATE",
    "DOCUMENT_VERSION_CREATE",
    "DOCUMENT_VERSION_VIEW",

    "ATTACHMENT_UPLOAD",
    "ATTACHMENT_VIEW",
    "ATTACHMENT_UPDATE",

    "WORKFLOW_ASSIGN",
    "WORKFLOW_REASSIGN",
    "WORKFLOW_RETURN",
    "WORKFLOW_VIEW",

    "REMARK_CREATE",
    "REMARK_VIEW",

    "STATUS_HISTORY_VIEW",

    "NOTIFICATION_VIEW",
    "NOTIFICATION_MARK_READ",

    "REPORT_VIEW",
    "REPORT_GENERATE",
    "REPORT_EXPORT",
  ],

  SECTOR_STAFF: [
    "CASE_VIEW",
    "CASE_UPDATE",
    "CASE_ASSIGN",
    "CASE_REASSIGN",
    "CASE_RETURN",
    "CASE_CHANGE_STATUS",
    "CASE_ARCHIVE",

    "CUSTOMER_VIEW",

    "DOCUMENT_VIEW",
    "DOCUMENT_VERSION_CREATE",
    "DOCUMENT_VERSION_VIEW",

    "ATTACHMENT_VIEW",

    "WORKFLOW_ASSIGN",
    "WORKFLOW_REASSIGN",
    "WORKFLOW_RETURN",
    "WORKFLOW_VIEW",

    "REMARK_CREATE",
    "REMARK_VIEW",

    "DECISION_CREATE",
    "DECISION_VIEW",

    "STATUS_HISTORY_VIEW",

    "AUDIT_VIEW",

    "NOTIFICATION_VIEW",
    "NOTIFICATION_MARK_READ",

    "REPORT_VIEW",
    "REPORT_GENERATE",
    "REPORT_EXPORT",
  ],

  DIRECTORATE_STAFF: [
    "CASE_VIEW",
    "CASE_UPDATE",
    "CASE_ASSIGN",
    "CASE_REASSIGN",
    "CASE_RETURN",
    "CASE_CHANGE_STATUS",

    "CUSTOMER_VIEW",

    "DOCUMENT_VIEW",
    "DOCUMENT_VERSION_CREATE",
    "DOCUMENT_VERSION_VIEW",

    "ATTACHMENT_VIEW",

    "WORKFLOW_ASSIGN",
    "WORKFLOW_REASSIGN",
    "WORKFLOW_RETURN",
    "WORKFLOW_VIEW",

    "REMARK_CREATE",
    "REMARK_VIEW",

    "DECISION_CREATE",
    "DECISION_VIEW",

    "STATUS_HISTORY_VIEW",

    "NOTIFICATION_VIEW",
    "NOTIFICATION_MARK_READ",

    "REPORT_VIEW",
    "REPORT_GENERATE",
    "REPORT_EXPORT",
  ],

  GROUP_STAFF: [
    "CASE_VIEW",
    "CASE_UPDATE",
    "CASE_ASSIGN",
    "CASE_REASSIGN",
    "CASE_RETURN",
    "CASE_CHANGE_STATUS",

    "CUSTOMER_VIEW",

    "DOCUMENT_VIEW",
    "DOCUMENT_VERSION_CREATE",
    "DOCUMENT_VERSION_VIEW",

    "ATTACHMENT_VIEW",

    "WORKFLOW_ASSIGN",
    "WORKFLOW_REASSIGN",
    "WORKFLOW_RETURN",
    "WORKFLOW_VIEW",

    "REMARK_CREATE",
    "REMARK_VIEW",

    "STATUS_HISTORY_VIEW",

    "NOTIFICATION_VIEW",
    "NOTIFICATION_MARK_READ",

    "REPORT_VIEW",
    "REPORT_GENERATE",
    "REPORT_EXPORT",
  ],
};

async function main() {
  console.log("Starting RBAC seeding...");

  // ------------------------------------------------------------
  // 1. Ensure roles exist
  // ------------------------------------------------------------

  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        name: role.name,
      },
      update: {
        description: role.description,
        isActive: true,
      },
      create: {
        name: role.name,
        description: role.description,
        isActive: true,
      },
    });

    console.log(`Role ensured: ${role.name}`);
  }

  // ------------------------------------------------------------
  // 2. Ensure role → permission assignments exist
  // ------------------------------------------------------------

  for (const [roleName, permissionNames] of Object.entries(
    rolePermissions,
  )) {
    const role = await prisma.role.findUnique({
      where: {
        name: roleName,
      },
    });

    if (!role) {
      throw new Error(`Role not found: ${roleName}`);
    }

    for (const permissionName of permissionNames) {
      const permission = await prisma.permission.findUnique({
        where: {
          name: permissionName,
        },
      });

      if (!permission) {
        throw new Error(
          `Permission not found: ${permissionName}`,
        );
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.roleId,
            permissionId: permission.permissionId,
          },
        },
        update: {},
        create: {
          roleId: role.roleId,
          permissionId: permission.permissionId,
        },
      });
    }

    console.log(
      `Permissions ensured for ${roleName}: ${permissionNames.length}`,
    );
  }

  console.log("RBAC seeding completed successfully.");
}

main()
  .catch((error) => {
    console.error("RBAC seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });