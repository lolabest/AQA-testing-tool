import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  testpilotPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.testpilotPrisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "info", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.testpilotPrisma = prisma;
}

export default prisma;
