import type { ReadonlyURLSearchParams } from "next/navigation";

const fallback = "/admin/dashboard";

/**
 * Clerk may send `redirect_url` (full URL) or our app may use `redirect` (path).
 * Normalize to a safe same-origin admin path for forceRedirectUrl.
 */
export function resolvePostAuthRedirect(
  searchParams: ReadonlyURLSearchParams | URLSearchParams,
): string {
  const raw =
    searchParams.get("redirect") ?? searchParams.get("redirect_url");
  if (!raw) return fallback;

  try {
    const decoded = decodeURIComponent(raw.trim());
    let path = decoded;
    if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
      const u = new URL(decoded);
      path = `${u.pathname}${u.search}`;
    }
    if (path === "/" || path === "") return fallback;
    if (path === "/admin" || path.startsWith("/admin/")) return path;
    return fallback;
  } catch {
    return fallback;
  }
}
