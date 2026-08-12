import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "./client.js";

describe("database client", () => {
  it("exports a PrismaClient singleton", async () => {
    const secondImport = await import("./client.js");

    expect(secondImport.prisma).toBe(prisma);
  });
});

describe.skipIf(!process.env.DATABASE_URL)("database connectivity", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("can execute a PostgreSQL query", async () => {
    const result = await prisma.$queryRaw<Array<{ value: number }>>`
      SELECT 1::int AS value
    `;

    expect(result).toEqual([{ value: 1 }]);
  });
});
