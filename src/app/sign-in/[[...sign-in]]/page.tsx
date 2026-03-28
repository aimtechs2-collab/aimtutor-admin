import { Suspense } from "react";
import { ClerkAdminLoginPageContent } from "@/components/auth/ClerkAdminLoginPageContent";

function SignInLoading() {
  return (
    <section className="flex min-h-dvh flex-col justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/40 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-md rounded-xl border border-slate-200/80 bg-white/80 px-6 py-10 text-center text-sm text-slate-500 shadow-sm backdrop-blur-sm">
        Loading sign in…
      </div>
    </section>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <ClerkAdminLoginPageContent />
    </Suspense>
  );
}

