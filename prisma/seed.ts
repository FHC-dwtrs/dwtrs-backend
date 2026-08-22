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

/**
 * Organizational Units
 *
 * parentName is used to establish the hierarchy:
 *
 * Sector
 *   ↓
 * Directorate
 *   ↓
 * Group
 */
const organizationalUnits = [
  // ============================================================
  // SECTORS
  // ============================================================

  {
    name: "Housing Development Sector",
    unitType: "SECTOR" as const,
    parentName: null,
  },
  {
    name: "Corporate Service Sector",
    unitType: "SECTOR" as const,
    parentName: null,
  },
  {
    name: "Houses Administration Sector",
    unitType: "SECTOR" as const,
    parentName: null,
  },
  {
    name: "Construction Input Supply Sector",
    unitType: "SECTOR" as const,
    parentName: null,
  },

  // ============================================================
  // HOUSING DEVELOPMENT SECTOR
  // ============================================================

  {
    name: "Project Monitoring Directorate",
    unitType: "DIRECTORATE" as const,
    parentName: "Housing Development Sector",
  },
  {
    name: "Land & Infrastructure Directorate",
    unitType: "DIRECTORATE" as const,
    parentName: "Housing Development Sector",
  },
  {
    name: "Project Study & Design Directorate",
    unitType: "DIRECTORATE" as const,
    parentName: "Housing Development Sector",
  },

  // ============================================================
  // CORPORATE SERVICE SECTOR
  // ============================================================

  {
    name: "Legal Service Directorate",
    unitType: "DIRECTORATE" as const,
    parentName: "Corporate Service Sector",
  },
  {
    name: "ICT Directorate",
    unitType: "DIRECTORATE" as const,
    parentName: "Corporate Service Sector",
  },
  {
    name: "HR Directorate",
    unitType: "DIRECTORATE" as const,
    parentName: "Corporate Service Sector",
  },
  {
    name: "Finance Directorate",
    unitType: "DIRECTORATE" as const,
    parentName: "Corporate Service Sector",
  },
  {
    name: "Records & Archive Directorate",
    unitType: "DIRECTORATE" as const,
    parentName: "Corporate Service Sector",
  },

  // ============================================================
  // HOUSES ADMINISTRATION SECTOR
  // ============================================================

  {
    name: "Customer Service Directorate",
    unitType: "DIRECTORATE" as const,
    parentName: "Houses Administration Sector",
  },
  {
    name: "Property Rental Directorate",
    unitType: "DIRECTORATE" as const,
    parentName: "Houses Administration Sector",
  },
  {
    name: "Maintenance Directorate",
    unitType: "DIRECTORATE" as const,
    parentName: "Houses Administration Sector",
  },
  {
    name: "Sales Directorate",
    unitType: "DIRECTORATE" as const,
    parentName: "Houses Administration Sector",
  },
  {
    name: "Branch Offices Directorate",
    unitType: "DIRECTORATE" as const,
    parentName: "Houses Administration Sector",
  },

  // ============================================================
  // CONSTRUCTION INPUT SUPPLY SECTOR
  // ============================================================

  {
    name: "Machinery & Vehicle Maintenance Directorate",
    unitType: "DIRECTORATE" as const,
    parentName: "Construction Input Supply Sector",
  },
  {
    name: "Construction Input Products Directorate",
    unitType: "DIRECTORATE" as const,
    parentName: "Construction Input Supply Sector",
  },

  // ============================================================
  // PROTOTYPE GROUPS
  // ============================================================

  {
    name: "ICT Group A",
    unitType: "GROUP" as const,
    parentName: "ICT Directorate",
  },
  {
    name: "ICT Group B",
    unitType: "GROUP" as const,
    parentName: "ICT Directorate",
  },
  // ============================================================
// HOUSING DEVELOPMENT — GROUPS
// ============================================================

{
  name: "Group A",
  unitType: "GROUP" as const,
  parentName: "Project Monitoring Directorate",
},
{
  name: "Group B",
  unitType: "GROUP" as const,
  parentName: "Land & Infrastructure Directorate",
},
];

async function main() {
  console.log("Starting DWTRS seeding...");

  // ============================================================
  // 1. ENSURE ROLES EXIST
  // ============================================================

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

  // ============================================================
  // 2. ENSURE ROLE → PERMISSION ASSIGNMENTS EXIST
  // ============================================================

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

  // ============================================================
  // 3. ENSURE ORGANIZATIONAL UNITS EXIST
  // ============================================================

  for (const unit of organizationalUnits) {
    let parentUnitId: string | null = null;

    // Find parent unit if this is a Directorate or Group
    if (unit.parentName) {
      const parent = await prisma.organizationalUnit.findFirst({
        where: {
          name: unit.parentName,
        },
      });

      if (!parent) {
        throw new Error(
          `Parent organizational unit not found: ${unit.parentName}`,
        );
      }

      parentUnitId = parent.unitId;
    }

    // Because "name" is not unique in the current schema,
    // use findFirst instead of upsert.
    const existingUnit =
      await prisma.organizationalUnit.findFirst({
        where: {
          name: unit.name,
          parentUnitId,
        },
      });

    if (existingUnit) {
      await prisma.organizationalUnit.update({
        where: {
          unitId: existingUnit.unitId,
        },
        data: {
          unitType: unit.unitType,
          parentUnitId,
          isActive: true,
        },
      });
    } else {
      await prisma.organizationalUnit.create({
        data: {
          name: unit.name,
          unitType: unit.unitType,
          parentUnitId,
          isActive: true,
        },
      });
    }

    console.log(`Organizational unit ensured: ${unit.name}`);
  }

  console.log(
    "RBAC and organizational unit seeding completed successfully.",
  );
}

main()
  .catch((error) => {
    console.error("DWTRS seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });