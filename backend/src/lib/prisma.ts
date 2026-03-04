import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "node:path";

const dbUrl = process.env.DATABASE_URL || `file:${path.join(process.cwd(), "data", "production.db")}`;

export function createPrismaClient(): PrismaClient {
  const adapter = new PrismaLibSql({ url: dbUrl });
  return new PrismaClient({ adapter } as never);
}

export const prisma = createPrismaClient();
