// Prisma config for Prisma 7+ "config" system.
// Keeping connection URLs out of schema.prisma so `prisma generate` works.
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "backend/prisma/schema.prisma",
  migrations: {
    path: "backend/prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});

