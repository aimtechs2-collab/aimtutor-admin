import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// PrismaClient is expensive; keep a single instance per server process.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  // Surface a clear error early in dev.
  throw new Error("Missing DATABASE_URL in environment");
}

// Neon: prefer the *-pooler* host + `pgbouncer=true` (or Neon’s Prisma template) so
// connections survive long requests (e.g. lesson video uploads) without "Server has closed the connection".

const adapter = new PrismaPg({ connectionString });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter, log: ["error"] });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

