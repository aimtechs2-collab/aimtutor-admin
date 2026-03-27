/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHmac } from "node:crypto";
import { requireDbUser } from "@backend/lib/auth";
import { prisma } from "@backend/lib/prisma";

async function ensureAdmin() {
  const me = await requireDbUser();
  if (me.role !== "admin") return { status: 403, json: { error: "Admin access required" } } as const;
  return null;
}

function certNumber(courseId: number, userId: number) {
  const rnd = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `AIM-${courseId}-${userId}-${rnd}`;
}

export async function getPaymentHistoryAdmin(searchParams: URLSearchParams) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;

  const page = Number(searchParams.get("page") ?? 1);
  const perPage = Number(searchParams.get("per_page") ?? 20);
  const status = searchParams.get("status");
  const offset = (page - 1) * perPage;

  try {
    const whereSql = status ? "WHERE p.status::text = $1" : "";
    const countQuery = `SELECT COUNT(*)::int AS total FROM payments p ${whereSql}`;
    const listQuery = `
      SELECT p.id, p.user_id, p.course_id, p.amount::text AS amount, p.currency, p.status::text AS status,
             p.payment_method, p.order_id, p.payment_id, p.created_at, p.updated_at,
             u.email AS user_email, c.title AS course_title
      FROM payments p
      LEFT JOIN users u ON u.id = p.user_id
      LEFT JOIN courses c ON c.id = p.course_id
      ${whereSql}
      ORDER BY p.created_at DESC
      LIMIT $${status ? 2 : 1} OFFSET $${status ? 3 : 2}
    `;

    const totalRows = status
      ? ((await prisma.$queryRawUnsafe(countQuery, status)) as Array<{ total: number }>)
      : ((await prisma.$queryRawUnsafe(countQuery)) as Array<{ total: number }>);

    const rows = status
      ? ((await prisma.$queryRawUnsafe(listQuery, status, perPage, offset)) as any[])
      : ((await prisma.$queryRawUnsafe(listQuery, perPage, offset)) as any[]);

    const total = totalRows[0]?.total ?? 0;
    return {
      payments: rows.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        course_id: r.course_id,
        amount: Number(r.amount),
        currency: r.currency,
        status: r.status,
        payment_method: r.payment_method,
        order_id: r.order_id,
        payment_id: r.payment_id,
        created_at: new Date(r.created_at).toISOString(),
        updated_at: new Date(r.updated_at).toISOString(),
        user_email: r.user_email,
        course_title: r.course_title,
      })),
      pagination: {
        page,
        per_page: perPage,
        total,
        pages: Math.max(1, Math.ceil(total / perPage)),
        has_next: page * perPage < total,
        has_prev: page > 1,
      },
    };
  } catch {
    return { payments: [], pagination: { page: 1, per_page: perPage, total: 0, pages: 1, has_next: false, has_prev: false } };
  }
}

export async function getPaymentDetailsAdmin(paymentId: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT p.*, u.email AS user_email, c.title AS course_title
       FROM payments p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN courses c ON c.id = p.course_id
       WHERE p.id = $1`,
      paymentId,
    )) as any[];
    const p = rows[0];
    if (!p) return { status: 404, json: { error: "Payment not found" } } as const;
    return {
      payment: {
        ...p,
        amount: Number(p.amount),
        status: String(p.status),
        created_at: new Date(p.created_at).toISOString(),
        updated_at: new Date(p.updated_at).toISOString(),
      },
    };
  } catch {
    return { status: 404, json: { error: "Payment not found" } } as const;
  }
}

export async function refundPaymentAdmin(paymentId: number, body: any) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const reason = typeof body?.reason === "string" ? body.reason : "Admin requested refund";
  try {
    const existing = (await prisma.$queryRawUnsafe(
      `SELECT id, status::text AS status FROM payments WHERE id = $1`,
      paymentId,
    )) as Array<{ id: number; status: string }>;
    if (!existing[0]) return { status: 404, json: { error: "Payment not found" } } as const;
    if (existing[0].status !== "completed") {
      return { status: 400, json: { error: "Only completed payments can be refunded" } } as const;
    }
    await prisma.$executeRawUnsafe(
      `UPDATE payments SET status = 'refunded', updated_at = NOW() WHERE id = $1`,
      paymentId,
    );
    return { message: "Refund processed", payment_id: paymentId, reason };
  } catch {
    return { status: 500, json: { error: "Failed to process refund" } } as const;
  }
}

export async function getAllCertificatesAdmin(searchParams: URLSearchParams) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const page = Number(searchParams.get("page") ?? 1);
  const perPage = Number(searchParams.get("per_page") ?? 20);
  const courseId = Number(searchParams.get("course_id"));
  const userId = Number(searchParams.get("user_id"));
  const offset = (page - 1) * perPage;

  const filters: string[] = [];
  const params: any[] = [];
  if (Number.isFinite(courseId)) {
    params.push(courseId);
    filters.push(`c.course_id = $${params.length}`);
  }
  if (Number.isFinite(userId)) {
    params.push(userId);
    filters.push(`c.user_id = $${params.length}`);
  }
  const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  try {
    const countQ = `SELECT COUNT(*)::int AS total FROM certificates c ${whereSql}`;
    const totalRows = (await prisma.$queryRawUnsafe(countQ, ...params)) as Array<{ total: number }>;

    const listQ = `
      SELECT c.*, u.email AS user_email, u.first_name, u.last_name, co.title AS course_title
      FROM certificates c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN courses co ON co.id = c.course_id
      ${whereSql}
      ORDER BY c.issued_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const rows = (await prisma.$queryRawUnsafe(listQ, ...params, perPage, offset)) as any[];
    const total = totalRows[0]?.total ?? 0;
    return {
      certificates: rows.map((r) => ({
        ...r,
        issued_at: new Date(r.issued_at).toISOString(),
      })),
      pagination: {
        page,
        per_page: perPage,
        total,
        pages: Math.max(1, Math.ceil(total / perPage)),
        has_next: page * perPage < total,
        has_prev: page > 1,
      },
    };
  } catch {
    return { certificates: [], pagination: { page: 1, per_page: perPage, total: 0, pages: 1, has_next: false, has_prev: false } };
  }
}

export async function bulkGenerateCertificatesAdmin(body: any) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const courseId = Number(body?.course_id);
  if (!Number.isFinite(courseId)) return { status: 400, json: { error: "Course ID is required" } } as const;

  try {
    const eligible = (await prisma.$queryRawUnsafe(
      `
      SELECT e.user_id
      FROM enrollments e
      WHERE e.course_id = $1
        AND e.completed_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM certificates c WHERE c.course_id = e.course_id AND c.user_id = e.user_id
        )
      `,
      courseId,
    )) as Array<{ user_id: number }>;

    let created = 0;
    for (const row of eligible) {
      const number = certNumber(courseId, row.user_id);
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO certificates (user_id, course_id, certificate_number, issued_at, verification_url)
        VALUES ($1, $2, $3, NOW(), $4)
        `,
        row.user_id,
        courseId,
        number,
        `/api/v1/certificates/verify/${number}`,
      );
      created += 1;
    }

    return {
      message: "Bulk certificate generation completed",
      certificates_generated: created,
      course_id: courseId,
    };
  } catch {
    return { status: 500, json: { error: "Failed bulk generation" } } as const;
  }
}

export async function verifyCertificate(certificateNumber: string) {
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `
      SELECT c.certificate_number, c.issued_at, u.first_name, u.last_name, co.title AS course_title,
             iu.first_name AS instructor_first_name, iu.last_name AS instructor_last_name
      FROM certificates c
      LEFT JOIN users u ON u.id = c.user_id
      LEFT JOIN courses co ON co.id = c.course_id
      LEFT JOIN users iu ON iu.id = co.instructor_id
      WHERE c.certificate_number = $1
      `,
      certificateNumber,
    )) as any[];
    const cert = rows[0];
    if (!cert) return { status: 404, json: { valid: false, error: "Certificate not found" } } as const;
    return {
      valid: true,
      certificate: {
        certificate_number: cert.certificate_number,
        issued_at: new Date(cert.issued_at).toISOString(),
        user_name: `${cert.first_name ?? ""} ${cert.last_name ?? ""}`.trim(),
        course_title: cert.course_title,
        instructor_name: `${cert.instructor_first_name ?? ""} ${cert.instructor_last_name ?? ""}`.trim(),
        issued_by: "Aim Technologies",
      },
    };
  } catch {
    return { status: 404, json: { valid: false, error: "Certificate not found" } } as const;
  }
}

export async function getLiveSessionsAdmin(searchParams: URLSearchParams) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const page = Number(searchParams.get("page") ?? 1);
  const perPage = Number(searchParams.get("per_page") ?? 20);
  const courseId = Number(searchParams.get("course_id"));
  const upcomingOnly = (searchParams.get("upcoming_only") ?? "false").toLowerCase() === "true";
  const offset = (page - 1) * perPage;

  const filters: string[] = [];
  const params: any[] = [];
  if (Number.isFinite(courseId)) {
    params.push(courseId);
    filters.push(`l.course_id = $${params.length}`);
  }
  if (upcomingOnly) filters.push(`l.scheduled_at > NOW()`);
  const whereSql = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  try {
    const countQ = `SELECT COUNT(*)::int AS total FROM live_sessions l ${whereSql}`;
    const totalRows = (await prisma.$queryRawUnsafe(countQ, ...params)) as Array<{ total: number }>;
    const listQ = `
      SELECT l.*, c.title AS course_title, c.thumbnail AS course_thumbnail
      FROM live_sessions l
      LEFT JOIN courses c ON c.id = l.course_id
      ${whereSql}
      ORDER BY l.scheduled_at ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const rows = (await prisma.$queryRawUnsafe(listQ, ...params, perPage, offset)) as any[];
    const total = totalRows[0]?.total ?? 0;
    return {
      live_sessions: rows.map((r) => ({
        ...r,
        scheduled_at: new Date(r.scheduled_at).toISOString(),
        created_at: new Date(r.created_at).toISOString(),
        course: { id: r.course_id, title: r.course_title, thumbnail: r.course_thumbnail },
      })),
      pagination: {
        page,
        per_page: perPage,
        total,
        pages: Math.max(1, Math.ceil(total / perPage)),
        has_next: page * perPage < total,
        has_prev: page > 1,
      },
    };
  } catch {
    return { live_sessions: [], pagination: { page: 1, per_page: perPage, total: 0, pages: 1, has_next: false, has_prev: false } };
  }
}

export async function createLiveSessionAdmin(body: any) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const courseId = Number(body?.course_id);
  const title = String(body?.title ?? "").trim();
  const durationMinutes = Number(body?.duration_minutes);
  const scheduledAt = body?.scheduled_at ? new Date(body.scheduled_at) : null;
  if (!Number.isFinite(courseId) || !title || !Number.isFinite(durationMinutes) || !scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return { status: 400, json: { error: "course_id, title, scheduled_at, duration_minutes are required" } } as const;
  }
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `
      INSERT INTO live_sessions
      (course_id, title, description, scheduled_at, duration_minutes, meeting_url, meeting_id, meeting_password, is_recorded, recording_url, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
      RETURNING *
      `,
      courseId,
      title,
      body?.description ?? null,
      scheduledAt,
      durationMinutes,
      body?.meeting_url ?? null,
      body?.meeting_id ?? null,
      body?.meeting_password ?? null,
      Boolean(body?.is_recorded ?? false),
      body?.recording_url ?? null,
    )) as any[];
    return { message: "Live session created successfully", live_session: rows[0] };
  } catch {
    return { status: 500, json: { error: "Failed to create live session" } } as const;
  }
}

export async function getLiveSessionAdmin(sessionId: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT l.*, c.title AS course_title FROM live_sessions l LEFT JOIN courses c ON c.id = l.course_id WHERE l.id = $1`,
      sessionId,
    )) as any[];
    if (!rows[0]) return { status: 404, json: { error: "Live session not found" } } as const;
    return { live_session: rows[0] };
  } catch {
    return { status: 404, json: { error: "Live session not found" } } as const;
  }
}

export async function updateLiveSessionAdmin(sessionId: number, body: any) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  const fields: string[] = [];
  const values: any[] = [];
  const pushField = (sql: string, v: any) => {
    values.push(v);
    fields.push(`${sql} = $${values.length}`);
  };
  if (body?.title !== undefined) pushField("title", body.title);
  if (body?.description !== undefined) pushField("description", body.description);
  if (body?.scheduled_at !== undefined) pushField("scheduled_at", new Date(body.scheduled_at));
  if (body?.duration_minutes !== undefined) pushField("duration_minutes", Number(body.duration_minutes));
  if (body?.meeting_url !== undefined) pushField("meeting_url", body.meeting_url);
  if (body?.meeting_id !== undefined) pushField("meeting_id", body.meeting_id);
  if (body?.meeting_password !== undefined) pushField("meeting_password", body.meeting_password);
  if (body?.is_recorded !== undefined) pushField("is_recorded", Boolean(body.is_recorded));
  if (body?.recording_url !== undefined) pushField("recording_url", body.recording_url);
  if (!fields.length) return { status: 400, json: { error: "No fields provided to update" } } as const;

  values.push(sessionId);
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `UPDATE live_sessions SET ${fields.join(", ")} WHERE id = $${values.length} RETURNING *`,
      ...values,
    )) as any[];
    if (!rows[0]) return { status: 404, json: { error: "Live session not found" } } as const;
    return { message: "Live session updated successfully", live_session: rows[0] };
  } catch {
    return { status: 500, json: { error: "Failed to update live session" } } as const;
  }
}

export async function deleteLiveSessionAdmin(sessionId: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  try {
    const rows = (await prisma.$queryRawUnsafe(`DELETE FROM live_sessions WHERE id = $1 RETURNING id`, sessionId)) as any[];
    if (!rows[0]) return { status: 404, json: { error: "Live session not found" } } as const;
    return { message: "Live session deleted successfully" };
  } catch {
    return { status: 500, json: { error: "Failed to delete live session" } } as const;
  }
}

export async function getUpcomingLiveSessionsAdmin() {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `
      SELECT l.*, c.title AS course_title
      FROM live_sessions l
      LEFT JOIN courses c ON c.id = l.course_id
      WHERE l.scheduled_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
      ORDER BY l.scheduled_at ASC
      `,
    )) as any[];
    return {
      upcoming_sessions: rows.map((r) => ({
        ...r,
        scheduled_at: new Date(r.scheduled_at).toISOString(),
        created_at: new Date(r.created_at).toISOString(),
      })),
    };
  } catch {
    return { upcoming_sessions: [] };
  }
}

export async function getCourseLiveSessionsAdmin(courseId: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, title FROM courses WHERE id = $1`,
      courseId,
    )) as Array<{ id: number; title: string }>;
    if (!rows[0]) return { status: 404, json: { error: "Course not found" } } as const;
    const sessions = (await prisma.$queryRawUnsafe(
      `SELECT * FROM live_sessions WHERE course_id = $1 ORDER BY scheduled_at ASC`,
      courseId,
    )) as any[];
    return {
      course_id: courseId,
      course_title: rows[0].title,
      live_sessions: sessions.map((s) => ({
        ...s,
        scheduled_at: new Date(s.scheduled_at).toISOString(),
        created_at: new Date(s.created_at).toISOString(),
      })),
    };
  } catch {
    return { status: 500, json: { error: "Failed to fetch course live sessions" } } as const;
  }
}

export async function getCourseCertificatesAdmin(courseId: number) {
  const forbidden = await ensureAdmin();
  if (forbidden) return forbidden;
  try {
    const course = (await prisma.$queryRawUnsafe(
      `SELECT id, title FROM courses WHERE id = $1`,
      courseId,
    )) as Array<{ id: number; title: string }>;
    if (!course[0]) return { status: 404, json: { error: "Course not found" } } as const;
    const certs = (await prisma.$queryRawUnsafe(
      `
      SELECT c.*, u.email, u.first_name, u.last_name
      FROM certificates c
      LEFT JOIN users u ON u.id = c.user_id
      WHERE c.course_id = $1
      ORDER BY c.issued_at DESC
      `,
      courseId,
    )) as any[];
    return {
      course_id: courseId,
      course_title: course[0].title,
      certificates: certs.map((c) => ({
        ...c,
        issued_at: new Date(c.issued_at).toISOString(),
      })),
    };
  } catch {
    return { status: 500, json: { error: "Failed to fetch course certificates" } } as const;
  }
}

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 14)}`;
}

async function ensureCurrentUser() {
  const me = await requireDbUser();
  return me;
}

/** Matches legacy Flask env names; also accepts common alternate names. */
function getRazorpayCredentials() {
  const keyId = process.env.RAZOR_PAY_KEY ?? process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZOR_PAY_KEY_SECRET ?? process.env.RAZORPAY_KEY_SECRET;
  return { keyId, keySecret };
}

async function createRazorpayOrderApi(params: {
  amountPaise: number;
  currency: string;
  notes?: Record<string, string>;
}) {
  const { keyId, keySecret } = getRazorpayCredentials();
  if (!keyId || !keySecret) return null;

  const auth = Buffer.from(`${keyId}:${keySecret}`, "utf8").toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: params.currency.toUpperCase(),
      notes: params.notes ?? {},
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Razorpay order failed (${res.status}): ${text}`);
  }
  return (await res.json()) as { id: string; amount: number; currency: string };
}

export async function createOrder(body: any) {
  const me = await ensureCurrentUser();
  const courseId = Number(body?.course_id);
  if (!Number.isFinite(courseId)) return { status: 400, json: { error: "Course ID required" } } as const;

  try {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) return { status: 404, json: { error: "Course not found" } } as const;

    const enrolled = await prisma.enrollment.findFirst({
      where: { userId: me.id, courseId, isActive: true },
    });
    if (enrolled) return { status: 409, json: { error: "Already enrolled" } } as const;

    const priceNum = Number(course.price);
    const amountPaise = Math.max(1, Math.round(priceNum * 100));

    const rzOrder = await createRazorpayOrderApi({
      amountPaise,
      currency: course.currency,
      notes: {
        user_id: String(me.id),
        course_id: String(courseId),
        email: me.email,
      },
    });

    if (!rzOrder) {
      return {
        status: 503,
        json: {
          error:
            "Payment gateway not configured. Set RAZOR_PAY_KEY and RAZOR_PAY_KEY_SECRET (or RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).",
        },
      } as const;
    }

    const payment = await prisma.payment.create({
      data: {
        userId: me.id,
        courseId,
        amount: course.price,
        currency: rzOrder.currency,
        status: "pending",
        orderId: rzOrder.id,
      },
    });

    return {
      order_id: rzOrder.id,
      amount: rzOrder.amount,
      currency: rzOrder.currency,
      payment_id: payment.id,
    };
  } catch (e: any) {
    return { status: 500, json: { error: e?.message ?? "Failed to create order" } } as const;
  }
}

export async function verifyPayment(body: any) {
  const me = await ensureCurrentUser();
  const paymentId = Number(body?.payment_id);
  const razorpayPaymentId = String(body?.razorpay_payment_id ?? "");
  const razorpayOrderId = String(body?.razorpay_order_id ?? "");
  const razorpaySignature = String(body?.razorpay_signature ?? "");

  if (!Number.isFinite(paymentId) || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
    return { status: 400, json: { error: "Missing payment verification fields" } } as const;
  }

  const { keySecret } = getRazorpayCredentials();
  if (!keySecret) {
    return { status: 503, json: { error: "Payment gateway not configured" } } as const;
  }

  try {
    const p = await prisma.payment.findFirst({
      where: { id: paymentId, userId: me.id },
    });
    if (!p || !p.orderId || p.orderId !== razorpayOrderId) {
      return { status: 400, json: { error: "Invalid payment" } } as const;
    }

    const expected = createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");
    if (expected !== razorpaySignature) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: "failed" },
      });
      return { status: 400, json: { error: "Invalid signature" } } as const;
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
        paymentMethod: "razorpay",
        status: "completed",
      },
    });

    await prisma.enrollment.upsert({
      where: {
        userId_courseId: { userId: p.userId, courseId: p.courseId },
      },
      create: {
        userId: p.userId,
        courseId: p.courseId,
        progressPercentage: 0,
        isActive: true,
      },
      update: { isActive: true },
    });

    return { status: "Payment verified", payment_id: paymentId };
  } catch {
    return { status: 500, json: { error: "Failed to verify payment" } } as const;
  }
}

export async function createCheckoutSession(body: any) {
  const me = await ensureCurrentUser();
  const courseId = Number(body?.course_id);
  if (!Number.isFinite(courseId)) return { status: 400, json: { error: "Course ID is required" } } as const;
  try {
    const course = (await prisma.$queryRawUnsafe(
      `SELECT id, price::text AS price, currency FROM courses WHERE id = $1`,
      courseId,
    )) as Array<{ id: number; price: string; currency: string }>;
    if (!course[0]) return { status: 404, json: { error: "Course not found" } } as const;
    const sessionId = randomId("stripe_session");

    const rows = (await prisma.$queryRawUnsafe(
      `
      INSERT INTO payments (user_id, course_id, amount, currency, status, order_id, payment_method, created_at, updated_at)
      VALUES ($1,$2,$3,$4,'pending',$5,'stripe',NOW(),NOW())
      RETURNING id
      `,
      me.id,
      courseId,
      Number(course[0].price),
      course[0].currency,
      sessionId,
    )) as Array<{ id: number }>;

    return {
      checkout_url: `/payments/mock-checkout?session_id=${sessionId}`,
      session_id: sessionId,
      payment_id: rows[0].id,
    };
  } catch {
    return { status: 500, json: { error: "Failed to create checkout session" } } as const;
  }
}

export async function paymentSuccess(paymentId: number) {
  const me = await ensureCurrentUser();
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, user_id, course_id FROM payments WHERE id = $1`,
      paymentId,
    )) as Array<{ id: number; user_id: number; course_id: number }>;
    const p = rows[0];
    if (!p || p.user_id !== me.id) return { status: 404, json: { error: "Payment not found" } } as const;

    await prisma.$executeRawUnsafe(`UPDATE payments SET status = 'completed', updated_at = NOW() WHERE id = $1`, paymentId);
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO enrollments (user_id, course_id, enrolled_at, progress_percentage, is_active)
      SELECT $1, $2, NOW(), 0.0, true
      WHERE NOT EXISTS (SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2)
      `,
      p.user_id,
      p.course_id,
    );
    return { message: "Payment successful! You are now enrolled in the course.", payment_id: paymentId };
  } catch {
    return { status: 500, json: { error: "Failed to finalize payment" } } as const;
  }
}

export async function paymentCancel(paymentId: number) {
  const me = await ensureCurrentUser();
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, user_id FROM payments WHERE id = $1`,
      paymentId,
    )) as Array<{ id: number; user_id: number }>;
    const p = rows[0];
    if (!p || p.user_id !== me.id) return { status: 404, json: { error: "Payment not found" } } as const;
    await prisma.$executeRawUnsafe(`UPDATE payments SET status = 'failed', updated_at = NOW() WHERE id = $1`, paymentId);
    return { message: "Payment was cancelled", payment_id: paymentId };
  } catch {
    return { status: 500, json: { error: "Failed to cancel payment" } } as const;
  }
}

export async function stripeWebhook(body: any) {
  try {
    const eventType = String(body?.type ?? "");
    const sessionId = String(body?.data?.object?.id ?? "");
    if (!eventType || !sessionId) return { status: 400, json: { error: "Invalid webhook payload" } } as const;

    if (eventType === "checkout.session.completed") {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT id, user_id, course_id FROM payments WHERE order_id = $1`,
        sessionId,
      )) as Array<{ id: number; user_id: number; course_id: number }>;
      const p = rows[0];
      if (p) {
        await prisma.$executeRawUnsafe(`UPDATE payments SET status = 'completed', updated_at = NOW() WHERE id = $1`, p.id);
        await prisma.$executeRawUnsafe(
          `
          INSERT INTO enrollments (user_id, course_id, enrolled_at, progress_percentage, is_active)
          SELECT $1, $2, NOW(), 0.0, true
          WHERE NOT EXISTS (SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2)
          `,
          p.user_id,
          p.course_id,
        );
      }
    } else if (eventType === "checkout.session.expired") {
      await prisma.$executeRawUnsafe(`UPDATE payments SET status = 'failed', updated_at = NOW() WHERE order_id = $1`, sessionId);
    }
    return { status: "success" };
  } catch {
    return { status: 400, json: { error: "Webhook handling failed" } } as const;
  }
}

export async function razorpayWebhook(body: any) {
  try {
    const event = String(body?.event ?? "");
    if (event !== "payment.captured") return { status: "ok" };

    const capturedPaymentId = String(body?.payload?.payment?.entity?.id ?? "");
    if (!capturedPaymentId) return { status: 400, json: { error: "Invalid webhook payload" } } as const;

    const rows = (await prisma.$queryRawUnsafe(
      `SELECT id, user_id, course_id FROM payments WHERE payment_id = $1 OR order_id = $1`,
      capturedPaymentId,
    )) as Array<{ id: number; user_id: number; course_id: number }>;
    const p = rows[0];
    if (!p) return { status: "ok" };

    await prisma.$executeRawUnsafe(
      `UPDATE payments SET status = 'completed', payment_method = 'razorpay', updated_at = NOW() WHERE id = $1`,
      p.id,
    );
    await prisma.$executeRawUnsafe(
      `
      INSERT INTO enrollments (user_id, course_id, enrolled_at, progress_percentage, is_active)
      SELECT $1, $2, NOW(), 0.0, true
      WHERE NOT EXISTS (SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2)
      `,
      p.user_id,
      p.course_id,
    );
    return { status: "ok" };
  } catch {
    return { status: 400, json: { error: "Webhook handling failed" } } as const;
  }
}

export async function getUserCertificates() {
  const me = await ensureCurrentUser();
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `
      SELECT c.*, co.title AS course_title
      FROM certificates c
      LEFT JOIN courses co ON co.id = c.course_id
      WHERE c.user_id = $1
      ORDER BY c.issued_at DESC
      `,
      me.id,
    )) as any[];
    return {
      certificates: rows.map((r) => ({
        ...r,
        issued_at: new Date(r.issued_at).toISOString(),
        course: { id: r.course_id, title: r.course_title },
      })),
    };
  } catch {
    return { certificates: [] };
  }
}

export async function generateCertificate(courseId: number) {
  const me = await ensureCurrentUser();
  try {
    const enr = (await prisma.$queryRawUnsafe(
      `SELECT id, completed_at FROM enrollments WHERE user_id = $1 AND course_id = $2 AND is_active = true`,
      me.id,
      courseId,
    )) as Array<{ id: number; completed_at: Date | null }>;
    if (!enr[0]) return { status: 404, json: { error: "Not enrolled in this course" } } as const;
    if (!enr[0].completed_at) return { status: 400, json: { error: "Course not completed yet" } } as const;

    const existing = (await prisma.$queryRawUnsafe(
      `SELECT * FROM certificates WHERE user_id = $1 AND course_id = $2`,
      me.id,
      courseId,
    )) as any[];
    if (existing[0]) return { message: "Certificate already exists", certificate: existing[0] };

    const number = certNumber(courseId, me.id);
    const rows = (await prisma.$queryRawUnsafe(
      `
      INSERT INTO certificates (user_id, course_id, certificate_number, issued_at, verification_url)
      VALUES ($1,$2,$3,NOW(),$4)
      RETURNING *
      `,
      me.id,
      courseId,
      number,
      `/api/v1/certificates/verify/${number}`,
    )) as any[];
    return { message: "Certificate generated successfully", certificate: rows[0] };
  } catch {
    return { status: 500, json: { error: "Failed to generate certificate" } } as const;
  }
}

export async function downloadCertificate(certificateId: number) {
  const me = await ensureCurrentUser();
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `
      SELECT c.*, co.instructor_id
      FROM certificates c
      LEFT JOIN courses co ON co.id = c.course_id
      WHERE c.id = $1
      `,
      certificateId,
    )) as any[];
    const cert = rows[0];
    if (!cert) return { status: 404, json: { error: "Certificate not found" } } as const;
    const canAccess = cert.user_id === me.id || me.role === "admin" || cert.instructor_id === me.id;
    if (!canAccess) return { status: 403, json: { error: "Access denied" } } as const;

    return {
      certificate_id: cert.id,
      certificate_number: cert.certificate_number,
      // Keep compatible metadata even before PDF storage migration is complete.
      download_url: cert.file_path ?? null,
      verification_url: cert.verification_url ?? `/api/v1/certificates/verify/${cert.certificate_number}`,
    };
  } catch {
    return { status: 500, json: { error: "Failed to download certificate" } } as const;
  }
}

export async function regenerateCertificate(certificateId: number) {
  const me = await ensureCurrentUser();
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `SELECT * FROM certificates WHERE id = $1`,
      certificateId,
    )) as any[];
    const cert = rows[0];
    if (!cert) return { status: 404, json: { error: "Certificate not found" } } as const;
    if (cert.user_id !== me.id && me.role !== "admin") return { status: 403, json: { error: "Access denied" } } as const;

    const updated = (await prisma.$queryRawUnsafe(
      `UPDATE certificates SET issued_at = NOW() WHERE id = $1 RETURNING *`,
      certificateId,
    )) as any[];
    return { message: "Certificate regenerated successfully", certificate: updated[0] };
  } catch {
    return { status: 500, json: { error: "Failed to regenerate certificate" } } as const;
  }
}

export async function joinLiveSession(sessionId: number) {
  const me = await ensureCurrentUser();
  try {
    const rows = (await prisma.$queryRawUnsafe(
      `
      SELECT l.*, c.id AS course_id, c.title AS course_title, c.instructor_id
      FROM live_sessions l
      LEFT JOIN courses c ON c.id = l.course_id
      WHERE l.id = $1
      `,
      sessionId,
    )) as any[];
    const s = rows[0];
    if (!s) return { status: 404, json: { error: "Live session not found" } } as const;

    let hasAccess = me.role === "admin" || s.instructor_id === me.id;
    if (!hasAccess) {
      const enr = (await prisma.$queryRawUnsafe(
        `SELECT id FROM enrollments WHERE user_id = $1 AND course_id = $2 AND is_active = true`,
        me.id,
        s.course_id,
      )) as any[];
      hasAccess = Boolean(enr[0]);
    }
    if (!hasAccess) return { status: 403, json: { error: "Access denied. Please enroll in the course first." } } as const;

    const start = new Date(s.scheduled_at);
    const end = new Date(start.getTime() + Number(s.duration_minutes ?? 0) * 60_000);
    const now = new Date();
    const joinOpen = new Date(start.getTime() - 15 * 60_000);

    if (now < joinOpen) {
      return {
        status: 400,
        json: {
          error: "Session has not started yet",
          scheduled_at: start.toISOString(),
          can_join_at: joinOpen.toISOString(),
        },
      } as const;
    }
    if (now > end) {
      return {
        status: 400,
        json: {
          error: "Session has ended",
          ended_at: end.toISOString(),
          recording_url: s.recording_url ?? null,
        },
      } as const;
    }

    return {
      join_info: {
        session_id: s.id,
        title: s.title,
        meeting_url: s.meeting_url,
        meeting_id: s.meeting_id,
        meeting_password: s.meeting_password,
        scheduled_at: start.toISOString(),
        duration_minutes: s.duration_minutes,
        course: {
          id: s.course_id,
          title: s.course_title,
        },
      },
    };
  } catch {
    return { status: 500, json: { error: "Failed to join session" } } as const;
  }
}
