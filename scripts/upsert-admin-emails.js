/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Upserts users from ADMIN_EMAILS (comma-separated in .env.local) with role admin.
 * Safe to re-run: creates missing rows or updates existing users to admin.
 */
require("dotenv").config({ path: ".env.local" });
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

function displayNameFromEmail(email) {
  const local = email.split("@")[0] ?? "admin";
  const token = local.split(/[._-]/)[0] ?? local;
  if (!token) return "Admin";
  return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Missing DATABASE_URL");

  const raw = process.env.ADMIN_EMAILS ?? "";
  const emails = raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length === 0) {
    console.error("No emails in ADMIN_EMAILS. Set it in .env.local first.");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  for (const email of emails) {
    const firstName = displayNameFromEmail(email);
    const row = await prisma.user.upsert({
      where: { email },
      update: {
        role: "admin",
        isActive: true,
        emailVerified: true,
      },
      create: {
        email,
        passwordHash: "clerk_auto",
        firstName,
        lastName: " ",
        role: "admin",
        isActive: true,
        emailVerified: true,
        phone: null,
        profilePicture: null,
        googleId: null,
        bio: null,
      },
    });
    console.log(`OK admin: ${row.email} (id=${row.id})`);
  }

  await prisma.$disconnect();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
