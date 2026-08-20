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
    description: "System administrator with system-level administration privileges.",
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

async function main() {
  console.log("Starting RBAC role seeding...");

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

  console.log("RBAC role seeding completed.");
}

main()
  .catch((error) => {
    console.error("RBAC role seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });