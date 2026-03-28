/**
 * Client-side: upload a video directly to Cloudinary (browser → Cloudinary, not through Next.js body).
 * Stores delivery-friendly URL with q_auto / f_auto for adaptive streaming-friendly defaults.
 */

function insertVideoOptimization(secureUrl: string): string {
  try {
    const u = new URL(secureUrl);
    if (!u.hostname.includes("res.cloudinary.com")) return secureUrl;
    const segments = u.pathname.split("/").filter(Boolean);
    const uploadIdx = segments.indexOf("upload");
    if (uploadIdx === -1) return secureUrl;
    const afterUpload = segments[uploadIdx + 1];
    if (afterUpload && (afterUpload.includes("q_auto") || afterUpload.includes("f_auto"))) {
      return secureUrl;
    }
    segments.splice(uploadIdx + 1, 0, "q_auto:good,f_auto");
    u.pathname = "/" + segments.join("/");
    return u.toString();
  } catch {
    return secureUrl;
  }
}

export type CloudinarySignPayload = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
};

export async function uploadVideoToCloudinary(file: File, sign: CloudinarySignPayload): Promise<string> {
  const { cloudName, apiKey, timestamp, signature, folder } = sign;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("api_key", apiKey);
  fd.append("timestamp", String(timestamp));
  fd.append("signature", signature);
  fd.append("folder", folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
    method: "POST",
    body: fd,
  });

  const data = (await res.json().catch(() => ({}))) as {
    secure_url?: string;
    error?: { message?: string } | string;
  };

  if (!res.ok) {
    const msg =
      typeof data.error === "object" && data.error?.message
        ? data.error.message
        : typeof data.error === "string"
          ? data.error
          : "Cloudinary upload failed";
    throw new Error(msg);
  }

  if (!data.secure_url) {
    throw new Error("Cloudinary returned no secure_url");
  }

  return insertVideoOptimization(data.secure_url);
}
