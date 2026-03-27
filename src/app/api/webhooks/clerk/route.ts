import { WebhookEvent } from "@clerk/nextjs/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@backend/lib/prisma";

function nameFromEvent(evt: WebhookEvent) {
  const data = evt.data as unknown as Record<string, unknown>;
  const firstName = (typeof data.first_name === "string" ? data.first_name : "").trim() || "User";
  const lastName = (typeof data.last_name === "string" ? data.last_name : "").trim() || " ";
  return { firstName, lastName };
}

function primaryEmail(evt: WebhookEvent): string | null {
  const data = evt.data as {
    primary_email_address_id?: string;
    email_addresses?: Array<{ id: string; email_address: string; verification?: { status?: string } }>;
  };
  const primaryId = data.primary_email_address_id;
  const match = data.email_addresses?.find((e) => e.id === primaryId);
  return match?.email_address ?? data.email_addresses?.[0]?.email_address ?? null;
}

export async function POST(req: NextRequest) {
  let evt: WebhookEvent;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  const email = primaryEmail(evt);
  if (!email) {
    return NextResponse.json({ error: "No email in Clerk event" }, { status: 400 });
  }

  const { firstName, lastName } = nameFromEvent(evt);
  const data = evt.data as {
    email_addresses?: Array<{ id: string; email_address: string; verification?: { status?: string } }>;
    image_url?: string;
  };
  const emailVerified = Boolean(
    data.email_addresses?.find((e) => e.email_address === email)?.verification?.status === "verified",
  );

  if (evt.type === "user.deleted") {
    await prisma.user.updateMany({
      where: { email },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true, action: "deactivated" });
  }

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName,
          lastName,
          emailVerified,
          isActive: true,
          profilePicture: data.image_url ?? existing.profilePicture,
        },
      });
      return NextResponse.json({ ok: true, action: "updated" });
    }

    await prisma.user.create({
      data: {
        email,
        passwordHash: "clerk_auto",
        firstName,
        lastName,
        role: "student",
        isActive: true,
        emailVerified,
        phone: null,
        profilePicture: data.image_url ?? null,
        googleId: null,
        bio: null,
      },
    });
    return NextResponse.json({ ok: true, action: "created" });
  }

  return NextResponse.json({ ok: true, ignored: evt.type });
}
