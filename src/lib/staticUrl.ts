/**
 * Same rules as the public LMS: resolve DB thumbnail paths and legacy CDN URLs.
 * NEXT_PUBLIC_STATIC_URL must not point at the old aifa-cloud host (it will be ignored).
 */

const DEFAULT_LEGACY_HOSTS = ["aifa-cloud.onrender.com", "www.aifa-cloud.onrender.com"];

function extraLegacyHosts(): string[] {
  return (process.env.NEXT_PUBLIC_LEGACY_UPLOAD_HOSTS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isLegacyHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (DEFAULT_LEGACY_HOSTS.includes(h)) return true;
  return extraLegacyHosts().includes(h);
}

export function getStaticUploadBase(): string {
  const raw = (process.env.NEXT_PUBLIC_STATIC_URL ?? "").trim();
  if (!raw) return "";
  const base = raw.replace(/\/+$/, "");
  try {
    const url = base.includes("://") ? new URL(base) : new URL(`https://${base}`);
    if (isLegacyHost(url.hostname)) return "";
  } catch {
    return base;
  }
  return base;
}

export function normalizeUploadPath(path: string): string {
  let p = path.replace(/\\/g, "/").trim();
  if (!p) return "";

  if (p.startsWith("//")) {
    p = `https:${p}`;
  }

  if (/^https?:\/\//i.test(p)) {
    try {
      const u = new URL(p);
      if (!isLegacyHost(u.hostname)) {
        return p;
      }
      p = u.pathname || "";
    } catch {
      return path.replace(/^\/+/, "");
    }
  }

  p = p.replace(/^\/+/, "");
  if (p.startsWith("static/uploads/")) {
    p = p.slice("static/".length);
  }
  p = p.replace(/^uploads\/uploads\//, "uploads/");
  return p;
}

export function thumbnailUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  let raw = path.trim();
  if (!raw) return null;

  if (raw.startsWith("//")) {
    raw = `https:${raw}`;
  }

  if (/^https?:\/\//i.test(raw)) {
    try {
      const u = new URL(raw);
      if (!isLegacyHost(u.hostname)) {
        return raw;
      }
      const cleanPath = normalizeUploadPath(u.pathname || "");
      if (!cleanPath) return null;
      const base = getStaticUploadBase();
      if (!base) {
        if (typeof window !== "undefined") {
          return `${window.location.origin}/${cleanPath}`;
        }
        return `/${cleanPath}`;
      }
      return `${base}/${cleanPath}`;
    } catch {
      return null;
    }
  }

  const cleanPath = normalizeUploadPath(raw);
  if (!cleanPath) return null;
  const base = getStaticUploadBase();
  if (!base) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/${cleanPath}`;
    }
    return `/${cleanPath}`;
  }
  return `${base}/${cleanPath}`;
}
