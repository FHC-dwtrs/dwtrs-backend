import "dotenv/config";
import argon2 from "argon2";

import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Starting test-user seeding...");

  // ============================================================
  // PASSWORDS
  // ============================================================

  const adminPasswordHash = await argon2.hash("Admin@123");

  const archivePasswordHash = await argon2.hash("Archive@123");

  const sectorPasswordHash = await argon2.hash("Sector@123");

  const directoratePasswordHash =
    await argon2.hash("Directorate@123");

  const groupPasswordHash =
    await argon2.hash("Group@123");

  // ============================================================
  // 1. SYSTEM ADMIN
  // ============================================================

  const systemAdminRole = await prisma.role.findUnique({
    where: {
      name: "SYSTEM_ADMIN",
    },
  });

  if (!systemAdminRole) {
    throw new Error("SYSTEM_ADMIN role not found.");
  }

  const adminUser = await prisma.user.upsert({
    where: {
      email: "admin@dwtrs.local",
    },
    update: {
      name: "System Administrator",
      passwordHash: adminPasswordHash,
      isActive: true,
    },
    create: {
      name: "System Administrator",
      email: "admin@dwtrs.local",
      passwordHash: adminPasswordHash,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.userId,
        roleId: systemAdminRole.roleId,
      },
    },
    update: {},
    create: {
      userId: adminUser.userId,
      roleId: systemAdminRole.roleId,
    },
  });

  console.log(
    "Test user ensured: admin@dwtrs.local → SYSTEM_ADMIN",
  );

  // ============================================================
  // 2. RECORDS & ARCHIVE STAFF
  // ============================================================

  const archiveRole = await prisma.role.findUnique({
    where: {
      name: "RECORDS_ARCHIVE_STAFF",
    },
  });

  if (!archiveRole) {
    throw new Error(
      "RECORDS_ARCHIVE_STAFF role not found.",
    );
  }

  const recordsArchiveUnit =
    await prisma.organizationalUnit.findFirst({
      where: {
        name: "Records & Archive Directorate",
        unitType: "DIRECTORATE",
        isActive: true,
      },
    });

  if (!recordsArchiveUnit) {
    throw new Error(
      "Records & Archive Directorate not found.",
    );
  }

  const archiveUser = await prisma.user.upsert({
    where: {
      email: "archive@dwtrs.local",
    },
    update: {
      name: "Records Archive Staff",
      passwordHash: archivePasswordHash,
      unitId: recordsArchiveUnit.unitId,
      isActive: true,
    },
    create: {
      name: "Records Archive Staff",
      email: "archive@dwtrs.local",
      passwordHash: archivePasswordHash,
      unitId: recordsArchiveUnit.unitId,
      isActive: true,
      roleId: archiveRole.roleId,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: archiveUser.userId,
        roleId: archiveRole.roleId,
      },
    },
    update: {},
    create: {
      userId: archiveUser.userId,
      roleId: archiveRole.roleId,
    },
  });

  console.log(
    "Test user ensured: archive@dwtrs.local → RECORDS_ARCHIVE_STAFF",
  );

  // ============================================================
  // 3. HOUSING DEVELOPMENT SECTOR STAFF
  // ============================================================

  const sectorRole = await prisma.role.findUnique({
    where: {
      name: "SECTOR_STAFF",
    },
  });

  if (!sectorRole) {
    throw new Error("SECTOR_STAFF role not found.");
  }

  const housingDevelopmentSector =
    await prisma.organizationalUnit.findFirst({
      where: {
        name: "Housing Development Sector",
        unitType: "SECTOR",
        isActive: true,
      },
    });

  if (!housingDevelopmentSector) {
    throw new Error(
      "Housing Development Sector not found.",
    );
  }

  const sectorUser = await prisma.user.upsert({
    where: {
      email: "sector@dwtrs.local",
    },
    update: {
      name: "Housing Development Sector Staff",
      passwordHash: sectorPasswordHash,
      unitId: housingDevelopmentSector.unitId,
      isActive: true,
    },
    create: {
      name: "Housing Development Sector Staff",
      email: "sector@dwtrs.local",
      passwordHash: sectorPasswordHash,
      unitId: housingDevelopmentSector.unitId,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: sectorUser.userId,
        roleId: sectorRole.roleId,
      },
    },
    update: {},
    create: {
      userId: sectorUser.userId,
      roleId: sectorRole.roleId,
    },
  });

  console.log(
    "Test user ensured: sector@dwtrs.local → SECTOR_STAFF",
  );

  // ============================================================
  // 4. DIRECTORATE ROLE
  // ============================================================

  const directorateRole = await prisma.role.findUnique({
    where: {
      name: "DIRECTORATE_STAFF",
    },
  });

  if (!directorateRole) {
    throw new Error(
      "DIRECTORATE_STAFF role not found.",
    );
  }

  // ============================================================
  // 5. PROJECT MONITORING DIRECTORATE
  // ============================================================

  let projectMonitoringDirectorate =
    await prisma.organizationalUnit.findFirst({
      where: {
        name: "Project Monitoring Directorate",
        unitType: "DIRECTORATE",
        isActive: true,
      },
    });

  if (!projectMonitoringDirectorate) {
    projectMonitoringDirectorate =
      await prisma.organizationalUnit.create({
        data: {
          name: "Project Monitoring Directorate",
          unitType: "DIRECTORATE",
          parentUnitId:
            housingDevelopmentSector.unitId,
          isActive: true,
        },
      });

    console.log(
      "Organizational unit created: Project Monitoring Directorate",
    );
  }

  // ============================================================
  // PROJECT MONITORING DIRECTORATE STAFF
  // ============================================================

  const projectUser = await prisma.user.upsert({
    where: {
      email: "project@dwtrs.local",
    },
    update: {
      name: "Project Monitoring Directorate Staff",
      passwordHash: directoratePasswordHash,
      unitId: projectMonitoringDirectorate.unitId,
      isActive: true,
    },
    create: {
      name: "Project Monitoring Directorate Staff",
      email: "project@dwtrs.local",
      passwordHash: directoratePasswordHash,
      unitId: projectMonitoringDirectorate.unitId,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: projectUser.userId,
        roleId: directorateRole.roleId,
      },
    },
    update: {},
    create: {
      userId: projectUser.userId,
      roleId: directorateRole.roleId,
    },
  });

  console.log(
    "Test user ensured: project@dwtrs.local → DIRECTORATE_STAFF",
  );

  // ============================================================
  // 6. LAND & INFRASTRUCTURE DIRECTORATE
  // ============================================================

  let landInfrastructureDirectorate =
    await prisma.organizationalUnit.findFirst({
      where: {
        name: "Land & Infrastructure Directorate",
        unitType: "DIRECTORATE",
        isActive: true,
      },
    });

  if (!landInfrastructureDirectorate) {
    landInfrastructureDirectorate =
      await prisma.organizationalUnit.create({
        data: {
          name: "Land & Infrastructure Directorate",
          unitType: "DIRECTORATE",
          parentUnitId:
            housingDevelopmentSector.unitId,
          isActive: true,
        },
      });

    console.log(
      "Organizational unit created: Land & Infrastructure Directorate",
    );
  }

  // ============================================================
  // LAND & INFRASTRUCTURE DIRECTORATE STAFF
  // ============================================================

  const landUser = await prisma.user.upsert({
    where: {
      email: "land@dwtrs.local",
    },
    update: {
      name: "Land & Infrastructure Directorate Staff",
      passwordHash: directoratePasswordHash,
      unitId: landInfrastructureDirectorate.unitId,
      isActive: true,
    },
    create: {
      name: "Land & Infrastructure Directorate Staff",
      email: "land@dwtrs.local",
      passwordHash: directoratePasswordHash,
      unitId: landInfrastructureDirectorate.unitId,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: landUser.userId,
        roleId: directorateRole.roleId,
      },
    },
    update: {},
    create: {
      userId: landUser.userId,
      roleId: directorateRole.roleId,
    },
  });

  console.log(
    "Test user ensured: land@dwtrs.local → DIRECTORATE_STAFF",
  );

  // ============================================================
  // 7. GROUP ROLE
  // ============================================================

  const groupRole = await prisma.role.findUnique({
    where: {
      name: "GROUP_STAFF",
    },
  });

  if (!groupRole) {
    throw new Error("GROUP_STAFF role not found.");
  }

  // ============================================================
  // 8. GROUP A — UNDER PROJECT MONITORING
  // ============================================================

  let groupA = await prisma.organizationalUnit.findFirst({
    where: {
      name: "Group A",
      unitType: "GROUP",
      parentUnitId:
        projectMonitoringDirectorate.unitId,
      isActive: true,
    },
  });

  if (!groupA) {
    groupA = await prisma.organizationalUnit.create({
      data: {
        name: "Group A",
        unitType: "GROUP",
        parentUnitId:
          projectMonitoringDirectorate.unitId,
        isActive: true,
      },
    });

    console.log(
      "Organizational unit created: Group A",
    );
  }

  // ============================================================
  // GROUP A STAFF
  // ============================================================

  const groupAUser = await prisma.user.upsert({
    where: {
      email: "groupa@dwtrs.local",
    },
    update: {
      name: "Project Monitoring Group A Staff",
      passwordHash: groupPasswordHash,
      unitId: groupA.unitId,
      isActive: true,
    },
    create: {
      name: "Project Monitoring Group A Staff",
      email: "groupa@dwtrs.local",
      passwordHash: groupPasswordHash,
      unitId: groupA.unitId,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: groupAUser.userId,
        roleId: groupRole.roleId,
      },
    },
    update: {},
    create: {
      userId: groupAUser.userId,
      roleId: groupRole.roleId,
    },
  });

  console.log(
    "Test user ensured: groupa@dwtrs.local → GROUP_STAFF",
  );

  // ============================================================
  // 9. GROUP B — UNDER LAND & INFRASTRUCTURE
  // ============================================================

  let groupB = await prisma.organizationalUnit.findFirst({
    where: {
      name: "Group B",
      unitType: "GROUP",
      parentUnitId:
        landInfrastructureDirectorate.unitId,
      isActive: true,
    },
  });

  if (!groupB) {
    groupB = await prisma.organizationalUnit.create({
      data: {
        name: "Group B",
        unitType: "GROUP",
        parentUnitId:
          landInfrastructureDirectorate.unitId,
        isActive: true,
      },
    });

    console.log(
      "Organizational unit created: Group B",
    );
  }

  // ============================================================
  // GROUP B STAFF
  // ============================================================

  const groupBUser = await prisma.user.upsert({
    where: {
      email: "groupb@dwtrs.local",
    },
    update: {
      name: "Land Infrastructure Group B Staff",
      passwordHash: groupPasswordHash,
      unitId: groupB.unitId,
      isActive: true,
    },
    create: {
      name: "Land Infrastructure Group B Staff",
      email: "groupb@dwtrs.local",
      passwordHash: groupPasswordHash,
      unitId: groupB.unitId,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: groupBUser.userId,
        roleId: groupRole.roleId,
      },
    },
    update: {},
    create: {
      userId: groupBUser.userId,
      roleId: groupRole.roleId,
    },
  });

  console.log(
    "Test user ensured: groupb@dwtrs.local → GROUP_STAFF",
  );

  // ============================================================
  // COMPLETE
  // ============================================================

  console.log("");
  console.log(
    "============================================================",
  );
  console.log("Test-user seeding completed successfully.");
  console.log(
    "============================================================",
  );

  console.log("");
  console.log("TEST USERS:");
  console.log(
    "admin@dwtrs.local    → Admin@123       → SYSTEM_ADMIN",
  );
  console.log(
    "archive@dwtrs.local  → Archive@123     → RECORDS_ARCHIVE_STAFF",
  );
  console.log(
    "sector@dwtrs.local   → Sector@123      → SECTOR_STAFF",
  );
  console.log(
    "project@dwtrs.local  → Directorate@123 → PROJECT MONITORING",
  );
  console.log(
    "land@dwtrs.local     → Directorate@123 → LAND & INFRASTRUCTURE",
  );
  console.log(
    "groupa@dwtrs.local   → Group@123       → GROUP A",
  );
  console.log(
    "groupb@dwtrs.local   → Group@123       → GROUP B",
  );
}

main()
  .catch((error) => {
    console.error(
      "Test-user seeding failed:",
      error,
    );
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });