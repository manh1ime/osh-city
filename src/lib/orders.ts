import "server-only";
import { OrderStatus } from "@prisma/client";
import { prisma } from "./db";
import { writeAudit, writeSecurityEvent } from "./audit";
import { hashValue, orderSignature } from "./hash";
import { checkOrderRateLimit } from "./rate-limit";
import { getRestaurant, getSecuritySettings } from "./restaurant";
import { createOrderSchema, firstZodError } from "./validation";
import type { SessionRole } from "./session-token";
import { staffStatusLabel } from "./format";

export type CreateOrderResult =
  | { ok: true; orderId: string; orderNumber: string; totalAmount: number }
  | {
      ok: false;
      error: string;
      code?: "INVALID_TOKEN" | "ORDERING_DISABLED" | "RATE_LIMITED";
    };

/** Разрешенные переходы статусов (техзадание 5.5). */
export const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  NEW: [OrderStatus.ACCEPTED, OrderStatus.CANCELED],
  ACCEPTED: [OrderStatus.SENT_TO_KITCHEN, OrderStatus.CANCELED],
  SENT_TO_KITCHEN: [OrderStatus.COMPLETED],
  COMPLETED: [],
  CANCELED: [],
};

export const orderInclude = {
  items: { orderBy: { nameSnapshot: "asc" } },
  table: { include: { branch: true } },
  acceptedBy: { select: { id: true, name: true, role: true } },
} as const;

async function nextOrderNumber(restaurantId: string): Promise<string> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const todayCount = await prisma.order.count({
    where: { restaurantId, createdAt: { gte: startOfDay } },
  });
  const now = new Date();
  const prefix = `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `${prefix}-${String(todayCount + 1).padStart(3, "0")}`;
}

/**
 * Создание гостевого заказа.
 * Цены ВСЕГДА пересчитываются на сервере, клиентские цены игнорируются.
 */
export async function createGuestOrder(
  rawInput: unknown,
  meta: {
    guestSessionId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
  },
): Promise<CreateOrderResult> {
  const parsed = createOrderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: firstZodError(parsed.error) };
  }
  const input = parsed.data;

  const restaurant = await getRestaurant();
  const table = await prisma.table.findUnique({
    where: { token: input.tableToken },
  });

  if (!table || table.restaurantId !== restaurant.id) {
    await writeSecurityEvent({
      restaurantId: restaurant.id,
      guestSessionId: meta.guestSessionId,
      type: "order.invalid_table_token",
      severity: "critical",
    });
    return { ok: false, error: "QR-код недействителен", code: "INVALID_TOKEN" };
  }
  if (!table.isActive) {
    return {
      ok: false,
      error: "Стол временно недоступен. Обратитесь к персоналу.",
      code: "INVALID_TOKEN",
    };
  }
  if (!restaurant.isOrderingEnabled) {
    return {
      ok: false,
      error:
        "Прием заказов временно отключен. Пожалуйста, обратитесь к официанту.",
      code: "ORDERING_DISABLED",
    };
  }

  const ids = Array.from(new Set(input.items.map((item) => item.menuItemId)));
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: ids }, restaurantId: restaurant.id },
  });
  const byId = new Map(menuItems.map((item) => [item.id, item]));

  for (const line of input.items) {
    const item = byId.get(line.menuItemId);
    if (!item)
      return {
        ok: false,
        error: "Одно из блюд больше недоступно. Обновите меню.",
      };
    if (!item.isActive)
      return { ok: false, error: `Блюдо «${item.name}» больше недоступно` };
    if (item.isStopListed)
      return { ok: false, error: `Блюдо «${item.name}» сегодня в стоп-листе` };
    if (item.price <= 0)
      return {
        ok: false,
        error: `У блюда «${item.name}» пока не указана цена. Обратитесь к официанту.`,
      };
  }

  const totalQuantity = input.items.reduce(
    (sum, line) => sum + line.quantity,
    0,
  );
  if (totalQuantity < 1) return { ok: false, error: "Корзина пуста" };

  const settings = await getSecuritySettings(restaurant.id);
  const signature = orderSignature(input.items, input.comment);

  const limit = await checkOrderRateLimit({
    restaurantId: restaurant.id,
    tableId: table.id,
    signature,
    guestSessionId: meta.guestSessionId,
    settings,
  });
  if (!limit.ok)
    return { ok: false, error: limit.message, code: "RATE_LIMITED" };

  // Цены берем только из базы
  const lines = input.items.map((line) => {
    const item = byId.get(line.menuItemId)!;
    return {
      menuItemId: item.id,
      nameSnapshot: item.name,
      priceSnapshot: item.price,
      quantity: line.quantity,
      comment: line.comment ?? null,
      totalPrice: item.price * line.quantity,
    };
  });
  const totalAmount = lines.reduce((sum, line) => sum + line.totalPrice, 0);

  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const orderNumber = await nextOrderNumber(restaurant.id);
    try {
      const order = await prisma.order.create({
        data: {
          restaurantId: restaurant.id,
          tableId: table.id,
          orderNumber,
          status: OrderStatus.NEW,
          totalAmount,
          itemsSignature: signature,
          guestComment: input.comment ?? null,
          guestSessionId: meta.guestSessionId ?? null,
          guestIpHash: hashValue(meta.ip),
          userAgentHash: hashValue(meta.userAgent),
          items: { create: lines },
          statusEvents: {
            create: { status: OrderStatus.NEW, note: "Заказ отправлен гостем" },
          },
        },
      });

      await writeAudit({
        restaurantId: restaurant.id,
        action: "order.created",
        entityType: "Order",
        entityId: order.id,
        metadata: {
          orderNumber: order.orderNumber,
          table: table.number,
          totalAmount,
          positions: lines.length,
          guestSessionId: meta.guestSessionId ?? null,
        },
      });

      return {
        ok: true,
        orderId: order.id,
        orderNumber: order.orderNumber,
        totalAmount,
      };
    } catch (error) {
      lastError = error;
    }
  }

  console.error("createGuestOrder failed", lastError);
  return { ok: false, error: "Не удалось создать заказ. Повторите попытку." };
}

/** Изменение статуса заказа сотрудником. */
export async function changeOrderStatus(input: {
  orderId: string;
  nextStatus: OrderStatus;
  user: {
    userId: string;
    role: SessionRole;
    restaurantId: string;
    name: string;
  };
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: { table: { select: { branchId: true } } },
  });
  if (!order || order.restaurantId !== input.user.restaurantId) {
    return { ok: false, error: "Заказ не найден" };
  }
  if (input.user.role !== "MANAGER") {
    const staff = await prisma.staffUser.findUnique({
      where: { id: input.user.userId },
      select: { branchId: true },
    });
    if (!staff?.branchId || order.table.branchId !== staff.branchId) {
      return { ok: false, error: "Этот заказ другого филиала" };
    }
  }
  if (!allowedTransitions[order.status].includes(input.nextStatus)) {
    return {
      ok: false,
      error: `Недопустимый переход статуса: ${staffStatusLabel[order.status]} → ${staffStatusLabel[input.nextStatus]}`,
    };
  }

  const now = new Date();
  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: input.nextStatus,
      acceptedAt:
        input.nextStatus === OrderStatus.ACCEPTED ? now : order.acceptedAt,
      acceptedByUserId:
        input.nextStatus === OrderStatus.ACCEPTED
          ? input.user.userId
          : order.acceptedByUserId,
      completedAt:
        input.nextStatus === OrderStatus.COMPLETED ? now : order.completedAt,
      canceledAt:
        input.nextStatus === OrderStatus.CANCELED ? now : order.canceledAt,
      statusEvents: {
        create: {
          status: input.nextStatus,
          userId: input.user.userId,
          note: input.user.name,
        },
      },
    },
  });

  await writeAudit({
    restaurantId: order.restaurantId,
    userId: input.user.userId,
    action:
      input.nextStatus === OrderStatus.ACCEPTED
        ? "order.accepted"
        : input.nextStatus === OrderStatus.CANCELED
          ? "order.canceled"
          : "order.status_changed",
    entityType: "Order",
    entityId: order.id,
    metadata: {
      from: order.status,
      to: input.nextStatus,
      orderNumber: order.orderNumber,
    },
  });

  return { ok: true };
}

/** Заказы для панели персонала (видны всем сотрудникам смены). */
export async function getStaffFeed(
  restaurantId: string,
  branchId?: string | null,
) {
  const since = new Date(Date.now() - 1000 * 60 * 60 * 12);
  const [orders, calls] = await Promise.all([
    prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: since },
        ...(branchId ? { table: { branchId } } : {}),
      },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      take: 120,
    }),
    prisma.waiterCall.findMany({
      where: {
        restaurantId,
        createdAt: { gte: since },
        ...(branchId ? { table: { branchId } } : {}),
      },
      include: { table: true, closedBy: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
  ]);
  return { orders, calls, serverTime: Date.now() };
}

export type StaffFeed = Awaited<ReturnType<typeof getStaffFeed>>;
export type StaffOrder = StaffFeed["orders"][number];
export type StaffCall = StaffFeed["calls"][number];
