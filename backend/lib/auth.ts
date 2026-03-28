import { currentUser, auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { prisma } from "./prisma";

async function getClerkEmail() {
  const cu = await currentUser();
  const email =
    cu?.primaryEmailAddress?.emailAddress ??
    cu?.emailAddresses?.[0]?.emailAddress ??
    null;
  return { email, cu };
}

export type DbUserDTO = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  phone: string | null;
  profilePicture: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function requireDbUser(): Promise<DbUserDTO> {
  const { userId } = await auth();
  let email: string | null = null;
  let firstName = "";
  let lastName = "";

  if (userId) {
    const fromClerk = await getClerkEmail();
    email = fromClerk.email;
    firstName = fromClerk.cu?.firstName ?? "";
    lastName = fromClerk.cu?.lastName ?? "";
  } else {
    // Dev/proxy fallback: if Clerk auth() cannot resolve userId on this hop,
    // accept identity forwarded by the trusted frontend.
    const hdrs = await headers();
    email = hdrs.get("x-clerk-email");
    firstName = hdrs.get("x-clerk-first-name") ?? "";
    lastName = hdrs.get("x-clerk-last-name") ?? "";
  }

  if (!email) {
    // API contract: let the UI handle 401/redirect.
    throw new Error("UNAUTHORIZED");
  }

  let dbUser =
    (await prisma.user.findUnique({ where: { email } })) ??
    (await prisma.user.create({
      data: {
        email,
        passwordHash: "clerk_auto",
        firstName: firstName || "User",
        lastName: lastName || " ",
        role: "student",
        isActive: true,
        emailVerified: true,
        phone: null,
        profilePicture: null,
        googleId: null,
        bio: null,
      },
    }));

  // Dev/admin bootstrap: allow promoting known admin emails via env.
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (dbUser.role !== "admin" && adminEmails.includes(email.toLowerCase())) {
    dbUser = await prisma.user.update({
      where: { id: dbUser.id },
      data: { role: "admin" },
    });
  }

  // Local convenience: if no admin exists yet, first signed-in user becomes admin.
  if (dbUser.role !== "admin" && process.env.NODE_ENV !== "production") {
    const admins = await prisma.user.count({ where: { role: "admin" } });
    if (admins === 0) {
      dbUser = await prisma.user.update({
        where: { id: dbUser.id },
        data: { role: "admin" },
      });
    }
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.firstName,
    lastName: dbUser.lastName,
    role: dbUser.role,
    isActive: dbUser.isActive,
    emailVerified: dbUser.emailVerified,
    phone: dbUser.phone ?? null,
    profilePicture: dbUser.profilePicture ?? null,
    bio: dbUser.bio ?? null,
    createdAt: dbUser.createdAt,
    updatedAt: dbUser.updatedAt,
  };
}
