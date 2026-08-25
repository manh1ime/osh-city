import { prisma } from "./db";
import { writeSecurityEvent } from "./audit";

export const RATE_LIMIT_MESSAGE =
  "Слишком много запросов. Пожалуйста, подождите немного или обратитесь к персоналу.";

type LimitResult = { ok: true } | { ok: false; message: string };

/**
 * Антиспам заказов. Считается по базе (работает на любом числе инстансов приложения).
 * - одинаковый заказ с одного стола не чаще чем раз в duplicateOrderWindowSec
 * - не больше maxOrdersPerWindow заказов за orderWindowMinutes
 */
export async function checkOrderRateLimit(input: {
  restaurantId: string;
  tableId: string;
  signature: string;
  guestSessionId?: string | null;
  settings: {
    duplicateOrderWindowSec: number;
    maxOrdersPerWindow: number;
    orderWindowMinutes: number;
  };
}): Promise<LimitResult> {
  const now = Date.now();

  if (input.settings.duplicateOrderWindowSec > 0) {
    const duplicateSince = new Date(
      now - input.settings.duplicateOrderWindowSec * 1000,
    );
    const duplicate = await prisma.order.findFirst({
      where: {
        restaurantId: input.restaurantId,
        tableId: input.tableId,
        itemsSignature: input.signature,
        createdAt: { gte: duplicateSince },
      },
      select: { id: true, orderNumber: true },
    });
    if (duplicate) {
      await writeSecurityEvent({
        restaurantId: input.restaurantId,
        tableId: input.tableId,
        guestSessionId: input.guestSessionId,
        type: "order.duplicate_blocked",
        severity: "warning",
        metadata: {
          windowSec: input.settings.duplicateOrderWindowSec,
          duplicateOf: duplicate.orderNumber,
        },
      });
      return { ok: false, message: RATE_LIMIT_MESSAGE };
    }
  }

  const windowSince = new Date(
    now - input.settings.orderWindowMinutes * 60 * 1000,
  );
  const recentCount = await prisma.order.count({
    where: {
      restaurantId: input.restaurantId,
      tableId: input.tableId,
      createdAt: { gte: windowSince },
    },
  });
  if (recentCount >= input.settings.maxOrdersPerWindow) {
    await writeSecurityEvent({
      restaurantId: input.restaurantId,
      tableId: input.tableId,
      guestSessionId: input.guestSessionId,
      type: "order.rate_limited",
      severity: "warning",
      metadata: {
        recentCount,
        limit: input.settings.maxOrdersPerWindow,
        windowMinutes: input.settings.orderWindowMinutes,
      },
    });
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }

  return { ok: true };
}

/** Антиспам вызовов официанта. */
export async function checkWaiterCallRateLimit(input: {
  restaurantId: string;
  tableId: string;
  guestSessionId?: string | null;
  settings: { maxCallsPerWindow: number; callWindowMinutes: number };
}): Promise<LimitResult> {
  const since = new Date(
    Date.now() - input.settings.callWindowMinutes * 60 * 1000,
  );
  const count = await prisma.waiterCall.count({
    where: {
      restaurantId: input.restaurantId,
      tableId: input.tableId,
      createdAt: { gte: since },
    },
  });
  if (count >= input.settings.maxCallsPerWindow) {
    await writeSecurityEvent({
      restaurantId: input.restaurantId,
      tableId: input.tableId,
      guestSessionId: input.guestSessionId,
      type: "waiter_call.rate_limited",
      severity: "warning",
      metadata: { count, limit: input.settings.maxCallsPerWindow },
    });
    return { ok: false, message: RATE_LIMIT_MESSAGE };
  }
  return { ok: true };
}
