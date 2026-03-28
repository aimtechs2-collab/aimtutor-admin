import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import AdminShell from "./AdminShell";
import { requireDbUser } from "@backend/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const authState = await auth();
  if (!authState.userId) {
    if (
      "redirectToSignIn" in authState &&
      typeof authState.redirectToSignIn === "function"
    ) {
      return authState.redirectToSignIn({ returnBackUrl: "/admin/dashboard" });
    }
    redirect("/sign-in");
  }

  const dbUser = await requireDbUser();
  if (dbUser.role !== "admin") redirect("/");

  const user = await currentUser();
  const welcomeName =
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Admin";

  return <AdminShell welcomeName={welcomeName}>{children}</AdminShell>;
}
