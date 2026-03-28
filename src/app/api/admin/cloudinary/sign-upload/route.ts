import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireDbUser } from "@backend/lib/auth";
import { getCloudinaryConfig } from "@/lib/cloudinary-config";

/**
 * Returns a signed upload payload for direct browser → Cloudinary uploads (videos).
 * Admin-only. Keeps API secret on the server.
 */
export async function POST() {
  try {
    const me = await requireDbUser();
    if (me.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const config = getCloudinaryConfig();
    if (!config) {
      return NextResponse.json(
        { error: "Cloudinary is not configured (set CLOUDINARY_URL or CLOUDINARY_* vars)" },
        { status: 503 },
      );
    }

    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });

    const timestamp = Math.round(Date.now() / 1000);
    const folder = (process.env.CLOUDINARY_LESSON_VIDEO_FOLDER ?? "geo-lms/lesson-videos").replace(/^\/+|\/+$/g, "");

    const params: Record<string, string | number> = {
      timestamp,
      folder,
    };

    const signature = cloudinary.utils.api_sign_request(params, config.apiSecret);

    return NextResponse.json({
      cloudName: config.cloudName,
      apiKey: config.apiKey,
      timestamp,
      signature,
      folder,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[cloudinary/sign-upload]", e);
    return NextResponse.json({ error: "Failed to sign upload" }, { status: 500 });
  }
}
