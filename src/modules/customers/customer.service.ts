import prisma from "../../config/database.js";
import {
  CreateCustomerInput,
  UpdateCustomerInput,
} from "./customer.validation.js";
import { Prisma } from "../../generated/prisma/client.js";

type PrismaClientLike =
  | typeof prisma
  | Prisma.TransactionClient;
// ============================================================
// GET ALL CUSTOMERS
// ============================================================

export async function getCustomers() {
  return prisma.customer.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

// ============================================================
// GET CUSTOMER BY ID
// ============================================================

export async function getCustomerById(customerId: string) {
  return prisma.customer.findUnique({
    where: {
      customerId,
    },
  });
}

// ============================================================
// GET CUSTOMER WITH CASES
// ============================================================

export async function getCustomerWithCases(
  customerId: string,
) {
  return prisma.customer.findUnique({
    where: {
      customerId,
    },

    include: {
      cases: {
        orderBy: {
          submittedAt: "desc",
        },

        include: {
          currentUnit: true,
        },
      },
    },
  });
}

// ============================================================
// CREATE CUSTOMER
// ============================================================

export async function createCustomer(
    input: CreateCustomerInput,
    db: PrismaClientLike = prisma,
  ) {
    return db.customer.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        address: input.address,
      },
    });
  }

// ============================================================
// UPDATE CUSTOMER
// ============================================================
export async function updateCustomer(
    customerId: string,
    input: UpdateCustomerInput,
    db: PrismaClientLike = prisma,
  ) {
    const existingCustomer =
      await db.customer.findUnique({
        where: {
          customerId,
        },
      });
  
    if (!existingCustomer) {
      throw new Error("Customer not found");
    }
  
    return db.customer.update({
      where: {
        customerId,
      },
  
      data: {
        ...(input.name !== undefined && {
          name: input.name,
        }),
  
        ...(input.phone !== undefined && {
          phone: input.phone,
        }),
  
        ...(input.email !== undefined && {
          email: input.email,
        }),
  
        ...(input.address !== undefined && {
          address: input.address,
        }),
      },
    });
  }


// ============================================================
// SEARCH CUSTOMERS
// ============================================================

export async function searchCustomers(
  search: string,
) {
  return prisma.customer.findMany({
    where: {
      OR: [
        {
          name: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          phone: {
            contains: search,
          },
        },
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    },

    orderBy: {
      name: "asc",
    },
  });
}

export async function getCustomerByPhone(
    phone: string,
    db: PrismaClientLike = prisma,
  ) {
    return db.customer.findFirst({
      where: {
        phone,
      },
    });
  }