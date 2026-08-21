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

  // ------------------------------------------------------------
  // 1. Find required roles
  // ------------------------------------------------------------

  const systemAdminRole = await prisma.role.findUnique({
    where: {
      name: "SYSTEM_ADMIN",
    },
  });

  const archiveStaffRole = await prisma.role.findUnique({
    where: {
      name: "RECORDS_ARCHIVE_STAFF",
    },
  });

  if (!systemAdminRole) {
    throw new Error(
      "SYSTEM_ADMIN role not found. Run npm run db:seed first.",
    );
  }

  if (!archiveStaffRole) {
    throw new Error(
      "RECORDS_ARCHIVE_STAFF role not found. Run npm run db:seed first.",
    );
  }

  // ------------------------------------------------------------
  // 2. Find Records & Archive Directorate
  // ------------------------------------------------------------

  const archiveUnit = await prisma.organizationalUnit.findFirst({
    where: {
      name: "Records & Archive Directorate",
      unitType: "DIRECTORATE",
      isActive: true,
    },
  });

  if (!archiveUnit) {
    throw new Error(
      "Records & Archive Directorate not found. Run npm run db:seed first.",
    );
  }

  // ------------------------------------------------------------
  // 3. Create System Admin test user
  // ------------------------------------------------------------

  const adminPasswordHash = await argon2.hash("Admin@123");

  const adminUser = await prisma.user.upsert({
    where: {
      email: "admin@dwtrs.local",
    },
    update: {
      name: "System Administrator",
      passwordHash: adminPasswordHash,
      isActive: true,
      unitId: null,
    },
    create: {
      name: "System Administrator",
      email: "admin@dwtrs.local",
      passwordHash: adminPasswordHash,
      isActive: true,
      unitId: null,
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
    `Test user ensured: ${adminUser.email} → SYSTEM_ADMIN`,
  );

  // ------------------------------------------------------------
  // 4. Create Records & Archive Staff test user
  // ------------------------------------------------------------

  const archivePasswordHash = await argon2.hash("Archive@123");

  const archiveUser = await prisma.user.upsert({
    where: {
      email: "archive@dwtrs.local",
    },
    update: {
      name: "Records Archive Staff",
      passwordHash: archivePasswordHash,
      isActive: true,
      unitId: archiveUnit.unitId,
    },
    create: {
      name: "Records Archive Staff",
      email: "archive@dwtrs.local",
      passwordHash: archivePasswordHash,
      isActive: true,
      unitId: archiveUnit.unitId,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: archiveUser.userId,
        roleId: archiveStaffRole.roleId,
      },
    },
    update: {},
    create: {
      userId: archiveUser.userId,
      roleId: archiveStaffRole.roleId,
    },
  });

  console.log(
    `Test user ensured: ${archiveUser.email} → RECORDS_ARCHIVE_STAFF`,
  );

  console.log("Test-user seeding completed successfully.");
}

main()
  .catch((error) => {
    console.error("Test-user seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });