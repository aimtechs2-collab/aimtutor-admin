import { prisma } from "@backend/lib/prisma";
import { requireDbUser } from "@backend/lib/auth";
import { toNotificationDict } from "./utils";

function buildPaginationMeta({
  page,
  perPage,
  total,
}: {
  page: number;
  perPage: number;
  total: number;
}) {
  const totalPages = total <= 0 ? 1 : Math.ceil(total / perPage);
  return {
    page,
    per_page: perPage,
    total,
    pages: totalPages,
    has_next: page < totalPages,
    has_prev: page > 1,
  };
}

export async function getNotifications(searchParams: URLSearchParams) {
  const dbUser = await requireDbUser();

  const page = Number(searchParams.get("page") ?? 1);
  const perPage = Number(searchParams.get("per_page") ?? 20);
  const unreadOnly = (searchParams.get("unread_only") ?? "false").toLowerCase() === "true";

  const where = {
    userId: dbUser.id,
    ...(unreadOnly ? { isRead: false } : {}),
  };

  const [total, notifications, unreadCount] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.notification.count({ where: { userId: dbUser.id, isRead: false } }),
  ]);

  return {
    notifications: notifications.map(toNotificationDict),
    pagination: buildPaginationMeta({ page, perPage, total }),
    unread_count: unreadCount,
  };
}

export async function getUnreadCount() {
  const dbUser = await requireDbUser();
  const unread_count = await prisma.notification.count({
    where: { userId: dbUser.id, isRead: false },
  });
  return { unread_count };
}

export async function markAllRead() {
  const dbUser = await requireDbUser();
  await prisma.notification.updateMany({
    where: { userId: dbUser.id, isRead: false },
    data: { isRead: true },
  });
  return { message: "All notifications marked as read" };
}

export async function markNotificationRead(notificationId: number) {
  const dbUser = await requireDbUser();

  const n = await prisma.notification.findFirst({
    where: { id: notificationId, userId: dbUser.id },
  });
  if (!n) return { status: 404, json: { error: "Notification not found" } } as const;

  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return {
    message: "Notification marked as read",
    notification: toNotificationDict(updated),
  };
}

export async function deleteNotification(notificationId: number) {
  const dbUser = await requireDbUser();

  const n = await prisma.notification.findFirst({
    where: { id: notificationId, userId: dbUser.id },
  });
  if (!n) return { status: 404, json: { error: "Notification not found" } } as const;

  await prisma.notification.delete({ where: { id: notificationId } });
  return { message: "Notification deleted successfully" };
}

