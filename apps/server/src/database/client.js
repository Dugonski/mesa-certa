import { PrismaClient } from "@prisma/client";
export const createDatabase = (databaseUrl) =>
  new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
