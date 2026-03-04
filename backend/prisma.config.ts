import path from "node:path";
import { defineConfig } from "prisma/config";

const dbUrl = process.env.DATABASE_URL || `file:${path.join(process.cwd(), "data", "production.db")}`;

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, "prisma", "schema.prisma"),
  datasource: {
    url: dbUrl,
  },
});
