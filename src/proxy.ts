import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  // Ensure auth() works for both admin pages and API handlers.
  // Public/private behavior is still decided inside route handlers.
  matcher: [
    // Run on all app/API routes except Next internals and static assets.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API and RPC routes.
    "/(api|trpc)(.*)",
  ],
};

