"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SignUp } from "@clerk/nextjs";

export function ClerkAdminSignupPageContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  const fallbackRedirect = "/admin/dashboard";

  const forceRedirectUrl = useMemo(() => {
    if (!redirect) return fallbackRedirect;
    try {
      const decoded = decodeURIComponent(redirect);
      // Never allow signup redirect to return to `/`.
      if (decoded === "/" || decoded === "") return fallbackRedirect;
      if (decoded === "/admin" || decoded.startsWith("/admin/")) return decoded;
      return fallbackRedirect;
    } catch {
      return fallbackRedirect;
    }
  }, [redirect, fallbackRedirect]);

  return (
    <section className="mt-24 min-h-[calc(100vh-220px)] bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40 px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto flex w-full max-w-5xl items-start justify-center lg:pt-1">
        <SignUp
          routing="hash"
          signInUrl="/login"
          forceRedirectUrl={forceRedirectUrl}
          appearance={{ elements: { rootBox: "w-full max-w-md" } }}
        />
      </div>
    </section>
  );
}

