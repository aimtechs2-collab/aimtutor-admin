"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SignIn } from "@clerk/nextjs";

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l1.2 4.2L17.4 8 13.2 9.2 12 13.4 10.8 9.2 6.6 8 10.8 6.2 12 2z" />
      <path d="M19 13l.7 2.3L22 16l-2.3.7L19 19l-.7-2.3L16 16l2.3-.7L19 13z" />
      <path d="M4.5 13.5l.6 2L7 16l-1.9.5-.6 2-.6-2L2 16l1.9-.5.6-2z" />
    </svg>
  );
}

export function ClerkAdminLoginPageContent() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  const fallbackRedirect = "/admin/dashboard";

  const forceRedirectUrl = useMemo(() => {
    if (!redirect) return fallbackRedirect;
    try {
      const decoded = decodeURIComponent(redirect);
      // Clerk sometimes sends the original location as `redirect`.
      // For the admin portal we never want to bounce back to `/`.
      if (decoded === "/" || decoded === "") return fallbackRedirect;
      if (decoded === "/admin" || decoded.startsWith("/admin/")) return decoded;
      return fallbackRedirect;
    } catch {
      return fallbackRedirect;
    }
  }, [redirect, fallbackRedirect]);

  return (
    <section className="mt-24 min-h-[calc(100vh-220px)] bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40 px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_1fr]">
        <div className="hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-900 p-10 text-white shadow-2xl lg:block">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium">
            <SparklesIcon className="h-4 w-4" />
            Admin Portal Access
          </div>
          <h1 className="text-4xl font-bold leading-tight">Welcome back to AIM Admin</h1>
          <p className="mt-4 text-base text-white/80">
            Manage courses, enrollments, payments, live sessions, and notifications securely.
          </p>

          <div className="mt-10 space-y-3 text-sm text-white/85">
            <p className="flex items-center gap-2">
              <LockIcon className="h-4 w-4" /> Secure sign in with Clerk
            </p>
            <p className="flex items-center gap-2">
              <LockIcon className="h-4 w-4" /> Encrypted sessions and account safety
            </p>
            <p className="flex items-center gap-2">
              <LockIcon className="h-4 w-4" /> One-click access with your account
            </p>
          </div>
        </div>

        <div className="flex items-start justify-center lg:pt-1">
          <SignIn
            routing="hash"
            signUpUrl="/sign-up"
            forceRedirectUrl={forceRedirectUrl}
            appearance={{ elements: { rootBox: "w-full max-w-md" } }}
          />
        </div>
      </div>
    </section>
  );
}

