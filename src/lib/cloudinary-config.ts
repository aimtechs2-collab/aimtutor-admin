/**
 * Reads Cloudinary credentials from CLOUDINARY_URL or discrete env vars.
 * CLOUDINARY_URL format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
 */
export type CloudinaryCredentials = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

export function getCloudinaryConfig(): CloudinaryCredentials | null {
  const fromUrl = process.env.CLOUDINARY_URL?.trim();
  if (fromUrl) {
    const m = fromUrl.match(/^cloudinary:\/\/([^:]+):([^@]+)@([^/?#]+)/i);
    if (m) {
      return { apiKey: m[1], apiSecret: m[2], cloudName: m[3] };
    }
  }
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (cloudName && apiKey && apiSecret) {
    return { cloudName, apiKey, apiSecret };
  }
  return null;
}
