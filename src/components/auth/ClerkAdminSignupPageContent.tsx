"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SignOutButton, SignUp, useAuth } from "@clerk/nextjs";
import { resolvePostAuthRedirect } from "@/lib/postAuthRedirect";

export function ClerkAdminSignupPageContent() {
  const { isLoaded } = useAuth();
  const searchParams = useSearchParams();

  const forceRedirectUrl = useMemo(
    () => resolvePostAuthRedirect(searchParams),
    [searchParams],
  );

  if (!isLoaded) {
    return (
      <section className="flex min-h-dvh flex-col justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40 px-4 py-6 md:px-6 md:py-8">
        <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200/80 bg-white/80 px-6 py-10 text-center text-sm text-slate-500 shadow-sm backdrop-blur-sm">
          Loading…
        </div>
      </section>
    );
  }

  return (
    <section className="flex min-h-dvh flex-col justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-3">
        <SignUp
          path="/sign-up"
          routing="path"
          signInUrl="/sign-in"
          forceRedirectUrl={forceRedirectUrl}
          appearance={{ elements: { rootBox: "w-full max-w-md" } }}
        />
        <p className="max-w-md text-center text-xs text-slate-500">
          Need a different account?{" "}
          <SignOutButton redirectUrl="/sign-up">
            <span className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-800">
              Sign out of this browser
            </span>
          </SignOutButton>
        </p>
      </div>
    </section>
  );
}

