import "server-only";

import { ReservationPreorderStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { writeAudit } from "./audit";
import { prisma } from "./db";
import { getRestaurant } from "./restaurant";
import {
  createReservationPreorderSchema,
  firstZodError,
  normalizeRussianPhone,
} from "./validation";

export type CreateReservationPreorderResult =
  | { ok: true; preorderId: string; preorderNumber: string }
  | { ok: false; error: string };

/** Создаёт предзаказ только для владельца действующей брони. */
export async function createReservationPreorder(
  rawInput: unknown,
  guestPhone: string | null,
): Promise<CreateReservationPreorderResult> {
  const normalizedPhone = normalizeRussianPhone(guestPhone ?? "");
  if (!normalizedPhone) {
    return {
      ok: false,
      error: "Сначала откройте свою бронь по номеру телефона",
    };
  }

  const parsed = createReservationPreorderSchema.safeParse(rawInput);
  if (!parsed.success) {
    return { ok: false, error: firstZodError(parsed.error) };
  }
  const input = parsed.data;
  const restaurant = await getRestaurant();

  if (!restaurant.isOrderingEnabled) {
    return { ok: false, error: "Приём заказов временно отключён" };
  }

  const reservation = await prisma.reservation.findFirst({
    where: {
      code: input.reservationCode,
      restaurantId: restaurant.id,
      guestPhone: normalizedPhone,
      status: { in: ["PENDING", "CONFIRMED"] },
      reservedAt: { gt: new Date() },
    },
    select: { id: true, code: true },
  });
  if (!reservation) {
    return { ok: false, error: "Активная бронь не найдена" };
  }

  const ids = Array.from(new Set(input.items.map((item) => item.menuItemId)));
  const menuItems = await prisma.menuItem.findMany({
    where: { id: { in: ids }, restaurantId: restaurant.id },
  });
  const byId = new Map(menuItems.map((item) => [item.id, item]));

  for (const line of input.items) {
    const item = byId.get(line.menuItemId);
    if (!item || !item.isActive) {
      return { ok: false, error: "Одно из блюд больше недоступно" };
    }
    if (item.isStopListed) {
      return { ok: false, error: `Блюдо «${item.name}» сегодня в стоп-листе` };
    }
    if (item.price <= 0) {
      return {
        ok: false,
        error: `У блюда «${item.name}» пока не указана цена. Обратитесь к официанту.`,
      };
    }
  }

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
  const previousCount = await prisma.reservationPreorder.count({
    where: { reservationId: reservation.id },
  });

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const preorderNumber = `${reservation.code}-${previousCount + attempt}`;
    try {
      const preorder = await prisma.reservationPreorder.create({
        data: {
          restaurantId: restaurant.id,
          reservationId: reservation.id,
          preorderNumber,
          timing: input.timing,
          totalAmount,
          guestComment: input.comment ?? null,
          items: { create: lines },
        },
      });

      await writeAudit({
        restaurantId: restaurant.id,
        action: "reservation_preorder.created",
        entityType: "ReservationPreorder",
        entityId: preorder.id,
        metadata: {
          reservationCode: reservation.code,
          preorderNumber,
          timing: input.timing,
          totalAmount,
        },
      });

      return { ok: true, preorderId: preorder.id, preorderNumber };
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== "P2002"
      ) {
        console.error("createReservationPreorder failed", error);
        return { ok: false, error: "Не удалось отправить предзаказ" };
      }
      // Повторяем только генерацию номера при редкой конкурентной коллизии.
    }
  }

  return { ok: false, error: "Не удалось отправить предзаказ" };
}

/**
 * Переходы предзаказа. Единый источник — src/lib/reservation-status.ts,
 * здесь оставлен алиас на типах Prisma для существующих импортов.
 */
export const preorderTransitions: Record<
  ReservationPreorderStatus,
  ReservationPreorderStatus[]
> = {
  NEW: [
    ReservationPreorderStatus.CONFIRMED,
    ReservationPreorderStatus.CANCELED,
  ],
  CONFIRMED: [
    ReservationPreorderStatus.IN_KITCHEN,
    ReservationPreorderStatus.CANCELED,
  ],
  IN_KITCHEN: [ReservationPreorderStatus.READY],
  READY: [],
  CANCELED: [],
};
