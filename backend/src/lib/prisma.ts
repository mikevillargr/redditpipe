import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "node:path";

export function createPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL || `file:${path.join(process.cwd(), "data", "production.db")}`;
  const adapter = new PrismaLibSql({ url: dbUrl });
  return new PrismaClient({ adapter });
}

export const prisma = createPrismaClient();
