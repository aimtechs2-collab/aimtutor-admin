import { NextResponse } from "next/server";

// Mimics the legacy `/api/detect-location` behavior used by the student/landing app.
export async function GET(req: Request) {
  const headers = req.headers;
  const country = headers.get("x-vercel-ip-country") ?? "IN";
  const region = headers.get("x-vercel-ip-country-region") ?? "TS";
  const city = headers.get("x-vercel-ip-city") ?? "Hyderabad";

  return NextResponse.json({
    country: country.toLowerCase(),
    region,
    city,
  });
}

