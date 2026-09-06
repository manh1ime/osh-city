import "server-only";

import webpush from "web-push";
import { prisma } from "./db";
import type { StaffNotification } from "./notifications";

/**
 * Отправка Web Push сотрудникам.
 *
 * `new Notification()` из браузера работает только в открытой вкладке, поэтому
 * телефон с закрытой панелью ничего не получал. Web Push доставляет сообщение
 * через сервис Google/Apple/Mozilla: браузер может быть свёрнут или закрыт.
 *
 * VAPID-ключи идентифицируют наш сервер. Публичный ключ уходит в браузер,
 * приватный остаётся здесь.
 */

let configured: boolean | null = null;

/** Ключи настроены. Без них push не отправляем, но панель работает как раньше. */
export function isPushConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) {
    configured = false;
    return configured;
  }
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:admin@osh-city.ru",
      publicKey,
      privateKey,
    );
    configured = true;
  } catch (error) {
    console.error("PUSH_VAPID_INVALID", error);
    configured = false;
  }
  return configured;
}

export type PushPayload = {
  title: string;
  body: string;
  /** Куда ведёт клик по уведомлению. */
  url: string;
  /** Группировка: повторный push с тем же tag заменяет предыдущий. */
  tag: string;
  urgency: "high" | "normal";
};

/**
 * Рисунок вибрации. Срочное событие ощущается длиннее,
 * чтобы официант различал его в кармане не глядя на экран.
 */
function vibratePattern(urgency: PushPayload["urgency"]): number[] {
  return urgency === "high"
    ? [200, 100, 200, 100, 300]
    : [150, 80, 150];
}

type SendResult = { sent: number; removed: number; failed: number };

/** Отправляет payload на все устройства пользователей из списка. */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload,
): Promise<SendResult> {
  const result: SendResult = { sent: 0, removed: 0, failed: 0 };
  if (!isPushConfigured() || userIds.length === 0) return result;

  const devices = await prisma.pushDevice.findMany({
    where: { userId: { in: userIds } },
  });
  if (devices.length === 0) return result;

  const message = JSON.stringify({
    ...payload,
    vibrate: vibratePattern(payload.urgency),
  });

  const staleIds: string[] = [];
  const deliveredIds: string[] = [];

  await Promise.all(
    devices.map(async (device) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: device.endpoint,
            keys: { p256dh: device.p256dh, auth: device.auth },
          },
          message,
          {
            // high: разбудить устройство сразу, normal: можно придержать до разблокировки.
            urgency: payload.urgency === "high" ? "high" : "normal",
            TTL: payload.urgency === "high" ? 600 : 3600,
          },
        );
        deliveredIds.push(device.id);
        result.sent += 1;
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        // 404/410: подписка отозвана браузером — устройство больше не существует.
        if (status === 404 || status === 410) {
          staleIds.push(device.id);
          result.removed += 1;
          return;
        }
        console.error("PUSH_SEND_FAILED", status, error);
        result.failed += 1;
      }
    }),
  );

  if (staleIds.length > 0) {
    await prisma.pushDevice
      .deleteMany({ where: { id: { in: staleIds } } })
      .catch((error) => console.error("PUSH_CLEANUP_FAILED", error));
  }
  if (deliveredIds.length > 0) {
    await prisma.pushDevice
      .updateMany({
        where: { id: { in: deliveredIds } },
        data: { lastUsedAt: new Date(), failureCount: 0 },
      })
      .catch((error) => console.error("PUSH_TOUCH_FAILED", error));
  }

  return result;
}

/**
 * Кому адресовано событие.
 *
 * Заказы и вызовы — всем сотрудникам филиала стола.
 * Брони и предзаказы — только старшим официантам этого филиала.
 * Менеджер получает всё целиком.
 */
export async function recipientsForEvent(input: {
  restaurantId: string;
  branchId: string | null;
  kind: "order" | "call" | "reservation" | "preorder";
}): Promise<string[]> {
  const seniorOnly =
    input.kind === "reservation" || input.kind === "preorder";

  const staff = await prisma.staffUser.findMany({
    where: {
      restaurantId: input.restaurantId,
      isActive: true,
      OR: [
        // Менеджер видит все столы, поэтому филиал у него не задан.
        { role: "MANAGER" },
        {
          role: seniorOnly ? "SENIOR_WAITER" : { in: ["WAITER", "SENIOR_WAITER"] },
          ...(input.branchId ? { branchId: input.branchId } : {}),
        },
      ],
    },
    select: { id: true },
  });

  return staff.map((person) => person.id);
}

/** Уведомление из ленты -> payload для push. */
export function payloadFromNotification(
  notification: StaffNotification,
): PushPayload {
  return {
    title: notification.title,
    body: notification.body,
    url: notification.href,
    tag: notification.id,
    urgency: notification.urgency,
  };
}
