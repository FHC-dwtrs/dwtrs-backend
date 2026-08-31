import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

// ============================================================
// ROLES
// ============================================================

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

// ============================================================
// PERMISSIONS
// ============================================================
//
// These permissions MUST exist before rolePermissions is processed.
//
// IMPORTANT:
// DocumentVersion was removed from the final database schema,
// therefore DOCUMENT_VERSION_CREATE and DOCUMENT_VERSION_VIEW
// are NOT included here.
// ============================================================

const permissions = [
  // ==========================================================
  // CASE
  // ==========================================================

  {
    name: "CASE_CREATE",
    description: "Create a new case.",
    resource: "CASE",
    action: "CREATE",
  },
  {
    name: "CASE_VIEW",
    description: "View cases.",
    resource: "CASE",
    action: "VIEW",
  },
  {
    name: "CASE_UPDATE",
    description: "Update case information.",
    resource: "CASE",
    action: "UPDATE",
  },
  {
    name: "CASE_ASSIGN",
    description: "Assign a case to another organizational unit.",
    resource: "CASE",
    action: "ASSIGN",
  },
  {
    name: "CASE_REASSIGN",
    description: "Reassign a case.",
    resource: "CASE",
    action: "REASSIGN",
  },
  {
    name: "CASE_RETURN",
    description: "Return a case to the previous organizational unit.",
    resource: "CASE",
    action: "RETURN",
  },
  {
    name: "CASE_CHANGE_STATUS",
    description: "Change the status of a case.",
    resource: "CASE",
    action: "CHANGE_STATUS",
  },
  {
    name: "CASE_ARCHIVE",
    description: "Archive a completed case.",
    resource: "CASE",
    action: "ARCHIVE",
  },

  // ==========================================================
  // CUSTOMER
  // ==========================================================

  {
    name: "CUSTOMER_CREATE",
    description: "Create a customer.",
    resource: "CUSTOMER",
    action: "CREATE",
  },
  {
    name: "CUSTOMER_VIEW",
    description: "View customer information.",
    resource: "CUSTOMER",
    action: "VIEW",
  },
  {
    name: "CUSTOMER_UPDATE",
    description: "Update customer information.",
    resource: "CUSTOMER",
    action: "UPDATE",
  },
// ==========================================================
// DOCUMENT
// ==========================================================

{
  name: "DOCUMENT_CREATE",
  description: "Create and upload a document.",
  resource: "DOCUMENT",
  action: "CREATE",
},
{
  name: "DOCUMENT_VIEW",
  description: "View documents.",
  resource: "DOCUMENT",
  action: "VIEW",
},
{
  name: "DOCUMENT_UPDATE",
  description: "Update document metadata.",
  resource: "DOCUMENT",
  action: "UPDATE",
},
{
  name: "DOCUMENT_DELETE",
  description: "Soft delete a document.",
  resource: "DOCUMENT",
  action: "DELETE",
},


// ==========================================================
// ATTACHMENT
// ==========================================================

{
  name: "ATTACHMENT_UPLOAD",
  description: "Upload an attachment to a document.",
  resource: "ATTACHMENT",
  action: "UPLOAD",
},
{
  name: "ATTACHMENT_VIEW",
  description: "View document attachments.",
  resource: "ATTACHMENT",
  action: "VIEW",
},
{
  name: "ATTACHMENT_UPDATE",
  description: "Update attachment metadata.",
  resource: "ATTACHMENT",
  action: "UPDATE",
},
{
  name: "ATTACHMENT_DELETE",
  description: "Soft delete a document attachment.",
  resource: "ATTACHMENT",
  action: "DELETE",
},

  // ==========================================================
  // WORKFLOW
  // ==========================================================

  {
    name: "WORKFLOW_ASSIGN",
    description: "Assign workflow work to an organizational unit.",
    resource: "WORKFLOW",
    action: "ASSIGN",
  },
  {
    name: "WORKFLOW_REASSIGN",
    description: "Reassign workflow work.",
    resource: "WORKFLOW",
    action: "REASSIGN",
  },
  {
    name: "WORKFLOW_RETURN",
    description: "Return workflow work.",
    resource: "WORKFLOW",
    action: "RETURN",
  },
  {
    name: "WORKFLOW_VIEW",
    description: "View workflow assignments.",
    resource: "WORKFLOW",
    action: "VIEW",
  },

  // ==========================================================
  // REMARK
  // ==========================================================

  {
    name: "REMARK_CREATE",
    description: "Create a remark.",
    resource: "REMARK",
    action: "CREATE",
  },
  {
    name: "REMARK_VIEW",
    description: "View remarks.",
    resource: "REMARK",
    action: "VIEW",
  },

  // ==========================================================
  // DECISION
  // ==========================================================

  {
    name: "DECISION_CREATE",
    description: "Create a decision.",
    resource: "DECISION",
    action: "CREATE",
  },
  {
    name: "DECISION_VIEW",
    description: "View decisions.",
    resource: "DECISION",
    action: "VIEW",
  },

  // ==========================================================
  // STATUS HISTORY
  // ==========================================================

  {
    name: "STATUS_HISTORY_VIEW",
    description: "View case status history.",
    resource: "STATUS_HISTORY",
    action: "VIEW",
  },

  // ==========================================================
  // AUDIT
  // ==========================================================

  {
    name: "AUDIT_VIEW",
    description: "View audit logs.",
    resource: "AUDIT",
    action: "VIEW",
  },
  {
    name: "AUDIT_EXPORT",
    description: "Export audit logs.",
    resource: "AUDIT",
    action: "EXPORT",
  },

  // ==========================================================
  // NOTIFICATION
  // ==========================================================

  {
    name: "NOTIFICATION_VIEW",
    description: "View notifications.",
    resource: "NOTIFICATION",
    action: "VIEW",
  },
  {
    name: "NOTIFICATION_MARK_READ",
    description: "Mark notifications as read.",
    resource: "NOTIFICATION",
    action: "MARK_READ",
  },

  // ==========================================================
  // USER
  // ==========================================================

  {
    name: "USER_CREATE",
    description: "Create a system user.",
    resource: "USER",
    action: "CREATE",
  },
  {
    name: "USER_VIEW",
    description: "View system users.",
    resource: "USER",
    action: "VIEW",
  },
  {
    name: "USER_UPDATE",
    description: "Update user information.",
    resource: "USER",
    action: "UPDATE",
  },
  {
    name: "USER_ACTIVATE",
    description: "Activate a user account.",
    resource: "USER",
    action: "ACTIVATE",
  },
  {
    name: "USER_DEACTIVATE",
    description: "Deactivate a user account.",
    resource: "USER",
    action: "DEACTIVATE",
  },
  {
    name: "USER_ASSIGN_ROLE",
    description: "Assign a role to a user.",
    resource: "USER",
    action: "ASSIGN_ROLE",
  },
  {
    name: "USER_REMOVE_ROLE",
    description: "Remove a role from a user.",
    resource: "USER",
    action: "REMOVE_ROLE",
  },

  // ==========================================================
  // ORGANIZATIONAL UNIT
  // ==========================================================

  {
    name: "UNIT_CREATE",
    description: "Create an organizational unit.",
    resource: "UNIT",
    action: "CREATE",
  },
  {
    name: "UNIT_VIEW",
    description: "View organizational units.",
    resource: "UNIT",
    action: "VIEW",
  },
  {
    name: "UNIT_UPDATE",
    description: "Update an organizational unit.",
    resource: "UNIT",
    action: "UPDATE",
  },
  {
    name: "UNIT_ACTIVATE",
    description: "Activate an organizational unit.",
    resource: "UNIT",
    action: "ACTIVATE",
  },
  {
    name: "UNIT_DEACTIVATE",
    description: "Deactivate an organizational unit.",
    resource: "UNIT",
    action: "DEACTIVATE",
  },

  // ==========================================================
  // ROLE
  // ==========================================================

  {
    name: "ROLE_VIEW",
    description: "View roles.",
    resource: "ROLE",
    action: "VIEW",
  },
  {
    name: "ROLE_ASSIGN_PERMISSION",
    description: "Assign a permission to a role.",
    resource: "ROLE",
    action: "ASSIGN_PERMISSION",
  },
  {
    name: "ROLE_REMOVE_PERMISSION",
    description: "Remove a permission from a role.",
    resource: "ROLE",
    action: "REMOVE_PERMISSION",
  },

  // ==========================================================
  // PERMISSION
  // ==========================================================

  {
    name: "PERMISSION_VIEW",
    description: "View permissions.",
    resource: "PERMISSION",
    action: "VIEW",
  },

  // ==========================================================
  // REPORT
  // ==========================================================

  {
    name: "REPORT_VIEW",
    description: "View reports.",
    resource: "REPORT",
    action: "VIEW",
  },
  {
    name: "REPORT_GENERATE",
    description: "Generate reports.",
    resource: "REPORT",
    action: "GENERATE",
  },
  {
    name: "REPORT_EXPORT",
    description: "Export reports.",
    resource: "REPORT",
    action: "EXPORT",
  },
];

// ============================================================
// ROLE → PERMISSION MAPPING
// ============================================================

const rolePermissions: Record<string, string[]> = {
  // ==========================================================
  // SYSTEM ADMIN
  // ==========================================================

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

  // ==========================================================
  // RECORDS & ARCHIVE STAFF
  // ==========================================================

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
    "DOCUMENT_DELETE",

    "ATTACHMENT_UPLOAD",
    "ATTACHMENT_VIEW",
    "ATTACHMENT_UPDATE",
    "ATTACHMENT_DELETE",

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

    "UNIT_VIEW",
  ],

  // ==========================================================
  // SECTOR STAFF
  // ==========================================================

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
    "DOCUMENT_UPDATE",

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

  // ==========================================================
  // DIRECTORATE STAFF
  // ==========================================================

  DIRECTORATE_STAFF: [
    "CASE_VIEW",
    "CASE_UPDATE",
    "CASE_ASSIGN",
    "CASE_REASSIGN",
    "CASE_RETURN",
    "CASE_CHANGE_STATUS",

    "CUSTOMER_VIEW",

    "DOCUMENT_VIEW",
    "DOCUMENT_UPDATE",

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

  // ==========================================================
  // GROUP STAFF
  // ==========================================================

  GROUP_STAFF: [
    "CASE_VIEW",
    "CASE_UPDATE",
    "CASE_ASSIGN",
    "CASE_REASSIGN",
    "CASE_RETURN",
    "CASE_CHANGE_STATUS",

    "CUSTOMER_VIEW",

    "DOCUMENT_VIEW",
    "DOCUMENT_UPDATE",

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


// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("Starting DWTRS seeding...\n");

  // ==========================================================
  // 1. ENSURE PERMISSIONS EXIST
  // ==========================================================

  console.log("Creating/updating permissions...");

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: {
        name: permission.name,
      },
      update: {
        description: permission.description,
        resource: permission.resource,
        action: permission.action,
      },
      create: {
        name: permission.name,
        description: permission.description,
        resource: permission.resource,
        action: permission.action,
      },
    });

    console.log(`Permission ensured: ${permission.name}`);
  }

  console.log(
    `\nPermissions ensured successfully: ${permissions.length}\n`,
  );

  // ==========================================================
  // 2. ENSURE ROLES EXIST
  // ==========================================================

  console.log("Creating/updating roles...");

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

  console.log("\nRoles ensured successfully.\n");

  // ==========================================================
  // 3. ENSURE ROLE → PERMISSION ASSIGNMENTS
  // ==========================================================

  console.log("Creating role → permission assignments...");

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

  console.log(
    "\nRole → permission assignments completed successfully.\n",
  );


  // ============================================================
// BOOTSTRAP SYSTEM ADMIN
// ============================================================

const bootstrapAdmin = {
  name: "System Administrator",
  email: "admin@fhc.gov.et",
  password: "Admin@123",
};  


// ==========================================================
// 4. ENSURE BOOTSTRAP SYSTEM ADMIN
// ==========================================================

console.log("Creating/updating bootstrap System Admin...");

const systemAdminRole = await prisma.role.findUnique({
  where: {
    name: "SYSTEM_ADMIN",
  },
});

if (!systemAdminRole) {
  throw new Error("SYSTEM_ADMIN role not found.");
}

const passwordHash = await argon2.hash(bootstrapAdmin.password);

const adminUser = await prisma.user.upsert({
  where: {
    email: bootstrapAdmin.email,
  },
  update: {
    name: bootstrapAdmin.name,
    passwordHash,
    isActive: true,
    unitId: null,
    roleId: systemAdminRole.roleId,
  },
  create: {
    name: bootstrapAdmin.name,
    email: bootstrapAdmin.email,
    passwordHash,
    isActive: true,
    unitId: null,
    roleId: systemAdminRole.roleId,
  },
});


console.log(`Bootstrap System Admin ensured: ${adminUser.email}`);
  // ==========================================================
  // FINAL SUMMARY
  // ==========================================================

  const permissionCount = await prisma.permission.count();
  const roleCount = await prisma.role.count();
 // const unitCount = await prisma.organizationalUnit.count();
  const rolePermissionCount =
    await prisma.rolePermission.count();

  console.log("============================================================");
  console.log("DWTRS SEEDING COMPLETED SUCCESSFULLY");
  console.log("============================================================");
  console.log(`Permissions:       ${permissionCount}`);
  console.log(`Roles:             ${roleCount}`);
  console.log(`Role Permissions:  ${rolePermissionCount}`);
 // console.log(`Org Units:         ${unitCount}`);
  console.log("============================================================");
}

// ============================================================
// EXECUTE
// ============================================================

main()
  .catch((error) => {
    console.error("\nDWTRS seeding failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });