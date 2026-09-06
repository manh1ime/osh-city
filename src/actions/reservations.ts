"use server";

import { randomInt } from "node:crypto";
import { Prisma, ReservationPreorderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { writeAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRestaurant } from "@/lib/restaurant";
import { ensureBranches } from "@/lib/branches";
import {
  GUEST_PHONE_COOKIE,
  GUEST_PHONE_TTL_SECONDS,
} from "@/lib/session-token";
import {
  RESERVATION_CODE_ALPHABET,
  RESERVATION_CODE_LENGTH,
  RESERVATION_LIMITS,
  combineDateAndTime,
  isTimeWithinWorkingHours,
} from "@/lib/reservations";
import {
  firstZodError,
  reservationLookupSchema,
  reservationSchema,
  reservationStatusSchema,
  normalizeRussianPhone,
} from "@/lib/validation";
import {
  canTransitionPreorder,
  canTransitionReservation,
} from "@/lib/reservation-status";
import { pushNewReservation, pushPreorderReady } from "@/lib/push-events";

/**
 * Ошибка внутри server action роняет всю страницу на «Application error».
 * Персоналу и гостю нужен обычный текст ошибки, поэтому любую проблему
 * (нет сессии, недостаточно прав, сбой БД) возвращаем как результат.
 */
async function guarded(
  label: string,
  task: () => Promise<{ ok: boolean; error?: string }>,
): Promise<{ ok: boolean; error?: string }> {
  try {
    return await task();
  } catch (error) {
    console.error(label, error);
    const message =
      error instanceof Error && error.message
        ? error.message
        : "Не удалось выполнить действие";
    return { ok: false, error: message };
  }
}

/** Запоминаем телефон гостя, чтобы раздел «Мои бронирования» открывался сразу. */
async function rememberGuestPhone(phone: string) {
  const store = await cookies();
  store.set(GUEST_PHONE_COOKIE, phone, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: GUEST_PHONE_TTL_SECONDS,
  });
}

/** Старший официант принимает предзаказ и управляет передачей на кухню. */
export async function setReservationPreorderStatusAction(
  preorderId: string,
  nextStatus: "CONFIRMED" | "IN_KITCHEN" | "READY" | "CANCELED",
): Promise<{ ok: boolean; error?: string }> {
  return guarded("setReservationPreorderStatusAction", () =>
    setReservationPreorderStatus(preorderId, nextStatus),
  );
}

async function setReservationPreorderStatus(
  preorderId: string,
  nextStatus: "CONFIRMED" | "IN_KITCHEN" | "READY" | "CANCELED",
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRole(["SENIOR_WAITER", "MANAGER"]);
  const actor = await prisma.staffUser.findUnique({
    where: { id: session.userId },
    select: { branchId: true },
  });
  const preorder = await prisma.reservationPreorder.findFirst({
    where: { id: preorderId, restaurantId: session.restaurantId },
    include: {
      reservation: { select: { branchId: true, status: true, code: true } },
    },
  });
  if (!preorder) return { ok: false, error: "Предзаказ не найден" };
  if (
    session.role === "SENIOR_WAITER" &&
    preorder.reservation.branchId !== actor?.branchId
  ) {
    return { ok: false, error: "Этот предзаказ другого филиала" };
  }
  const parsedStatus = nextStatus as ReservationPreorderStatus;
  if (!canTransitionPreorder(preorder.status, parsedStatus)) {
    return { ok: false, error: "Недопустимая смена статуса предзаказа" };
  }
  // Бронь отменена или гости не пришли: предзаказ по ней уже не готовим.
  if (
    preorder.reservation.status === "CANCELED" ||
    preorder.reservation.status === "NO_SHOW"
  ) {
    if (nextStatus !== "CANCELED") {
      return {
        ok: false,
        error:
          preorder.reservation.status === "CANCELED"
            ? "Бронь отменена: предзаказ можно только отменить"
            : "Гости не пришли: предзаказ можно только отменить",
      };
    }
  }
  if (
    nextStatus === ReservationPreorderStatus.IN_KITCHEN &&
    preorder.timing === "PREPARE_AFTER_SEATING" &&
    preorder.reservation.status !== "SEATED"
  ) {
    return { ok: false, error: "Сначала отметьте, что гости уже за столом" };
  }

  const now = new Date();
  const changed = await prisma.reservationPreorder.updateMany({
    where: { id: preorder.id, status: preorder.status },
    data: {
      status: parsedStatus,
      confirmedAt: nextStatus === "CONFIRMED" ? now : undefined,
      kitchenAt: nextStatus === "IN_KITCHEN" ? now : undefined,
      readyAt: nextStatus === "READY" ? now : undefined,
      canceledAt: nextStatus === "CANCELED" ? now : undefined,
    },
  });
  if (changed.count === 0) {
    return { ok: false, error: "Предзаказ уже обновлён другим сотрудником" };
  }
  await writeAudit({
    restaurantId: session.restaurantId,
    userId: session.userId,
    action: "reservation_preorder.status",
    entityType: "ReservationPreorder",
    entityId: preorder.id,
    metadata: { from: preorder.status, to: nextStatus },
  });
  // Готовое блюдо нужно подать сразу, поэтому сообщаем на телефон.
  if (nextStatus === "READY") await pushPreorderReady(preorder.id);
  revalidatePath("/staff/reservations");
  revalidatePath(`/reservation/${preorder.reservation.code}`);
  return { ok: true };
}

/** Код брони, который гость называет на входе. Только сервер: использует node:crypto. */
function generateReservationCode(): string {
  let code = "";
  for (let index = 0; index < RESERVATION_CODE_LENGTH; index += 1) {
    code +=
      RESERVATION_CODE_ALPHABET[randomInt(0, RESERVATION_CODE_ALPHABET.length)];
  }
  return code;
}

export type ReservationActionResult = {
  ok: boolean;
  error?: string;
  code?: string;
};

/**
 * Гостевое бронирование стола с лендинга.
 * Авторизация не нужна, поэтому все данные строго валидируются на сервере.
 */
export async function createReservationAction(
  formData: FormData,
): Promise<ReservationActionResult> {
  const parsed = reservationSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };
  const input = parsed.data;

  const restaurant = await getRestaurant();
  await ensureBranches(restaurant.id);

  const branch = await prisma.branch.findFirst({
    where: { slug: input.branchSlug, restaurantId: restaurant.id },
  });
  if (!branch || !branch.isActive) {
    return { ok: false, error: "Филиал не найден" };
  }

  const reservedAt = combineDateAndTime(input.date, input.time);
  if (!reservedAt) {
    return { ok: false, error: "Укажите дату и время визита" };
  }

  const now = Date.now();
  const leadMs = RESERVATION_LIMITS.minLeadMinutes * 60 * 1000;
  if (reservedAt.getTime() <= now) {
    return {
      ok: false,
      error: "Выберите корректные дату и время визита",
    };
  }
  if (reservedAt.getTime() < now + leadMs) {
    return {
      ok: false,
      error: `Бронь принимаем минимум за ${RESERVATION_LIMITS.minLeadMinutes} минут`,
    };
  }

  const maxMs = RESERVATION_LIMITS.maxDaysAhead * 24 * 60 * 60 * 1000;
  if (reservedAt.getTime() > now + maxMs) {
    return {
      ok: false,
      error: `Бронируем не больше чем на ${RESERVATION_LIMITS.maxDaysAhead} дней вперёд`,
    };
  }

  if (
    !isTimeWithinWorkingHours(input.time, branch.openTime, branch.closeTime)
  ) {
    return {
      ok: false,
      error: `Филиал принимает гостей с ${branch.openTime} до ${branch.closeTime}`,
    };
  }

  // Антидубль: тот же телефон и тот же слот в одном филиале.
  const duplicate = await prisma.reservation.findFirst({
    where: {
      branchId: branch.id,
      guestPhone: input.phone,
      reservedAt,
      status: { in: ["PENDING", "CONFIRMED"] },
    },
  });
  if (duplicate) {
    await rememberGuestPhone(input.phone);
    return { ok: true, code: duplicate.code };
  }

  // Маршрутизация: бронь падает старшему официанту зала.
  // Если старшего нет, бронь остаётся нераспределённой: её видит менеджер.
  const seniorWaiter = await prisma.staffUser.findFirst({
    where: {
      restaurantId: restaurant.id,
      branchId: branch.id,
      role: "SENIOR_WAITER",
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  // Код короткий, поэтому даём несколько попыток на случай коллизии.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateReservationCode();
    try {
      const created = await prisma.reservation.create({
        data: {
          restaurantId: restaurant.id,
          branchId: branch.id,
          code,
          guestName: input.name,
          guestPhone: input.phone,
          guestComment: input.comment || null,
          guestsCount: input.guests,
          reservedAt,
          assignedToId: seniorWaiter?.id ?? null,
        },
        select: { id: true },
      });

      await rememberGuestPhone(input.phone);
      // Старший официант узнаёт о брони сразу, а не при следующем открытии панели.
      await pushNewReservation(created.id);
      revalidatePath("/");
      revalidatePath("/my-reservations");
      revalidatePath("/staff/reservations");
      return { ok: true, code };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError)) throw error;
      if (error.code !== "P2002") throw error;

      // A concurrent request can win either the code or the slot constraint.
      const concurrentDuplicate = await prisma.reservation.findFirst({
        where: {
          branchId: branch.id,
          guestPhone: input.phone,
          reservedAt,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        select: { code: true },
      });
      if (concurrentDuplicate) {
        await rememberGuestPhone(input.phone);
        return { ok: true, code: concurrentDuplicate.code };
      }
      // The generated code collided; try another cryptographically random code.
    }
  }

  return { ok: false, error: "Не удалось создать бронь. Попробуйте ещё раз." };
}

/** Гость вводит телефон и видит свои брони. Пароль и аккаунт не нужны. */
export async function lookupReservationsAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = reservationLookupSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };

  await rememberGuestPhone(parsed.data.phone);
  revalidatePath("/my-reservations");
  return { ok: true };
}

/** Гость отменяет свою бронь по коду. Проверяем, что телефон совпадает с cookie. */
export async function cancelMyReservationAction(
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  return guarded("cancelMyReservationAction", () =>
    cancelMyReservation(code),
  );
}

async function cancelMyReservation(
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const store = await cookies();
  const phone = normalizeRussianPhone(store.get(GUEST_PHONE_COOKIE)?.value ?? "");
  if (!phone) return { ok: false, error: "Сначала укажите телефон" };

  const restaurant = await getRestaurant();
  const reservation = await prisma.reservation.findFirst({
    where: {
      code: code.toUpperCase(),
      restaurantId: restaurant.id,
      guestPhone: phone,
    },
    select: { id: true, status: true },
  });
  if (!reservation) return { ok: false, error: "Бронь не найдена" };
  if (reservation.status === "CANCELED") return { ok: true };
  if (reservation.status !== "PENDING" && reservation.status !== "CONFIRMED") {
    return { ok: false, error: "Эту бронь уже нельзя отменить" };
  }

  const now = new Date();
  const changed = await prisma.$transaction(async (tx) => {
    const reservationChanged = await tx.reservation.updateMany({
      where: {
        id: reservation.id,
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      data: { status: "CANCELED", canceledAt: now },
    });
    if (reservationChanged.count === 0) return false;

    await tx.reservationPreorder.updateMany({
      where: {
        reservationId: reservation.id,
        status: { not: "CANCELED" },
      },
      data: { status: "CANCELED", canceledAt: now },
    });
    return true;
  });
  if (!changed) {
    return { ok: true };
  }

  revalidatePath("/my-reservations");
  revalidatePath("/staff/reservations");
  revalidatePath(`/reservation/${code.toUpperCase()}`);
  return { ok: true };
}

/**
 * Смена статуса брони со стороны персонала.
 * Старший официант видит свой зал, менеджер — весь ресторан.
 */
export async function setReservationStatusAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  return guarded("setReservationStatusAction", () =>
    setReservationStatus(formData),
  );
}

async function setReservationStatus(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireRole(["SENIOR_WAITER", "MANAGER"]);
  const parsed = reservationStatusSchema.safeParse(
    Object.fromEntries(formData.entries()),
  );
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };
  const { reservationId, status } = parsed.data;

  const actor = await prisma.staffUser.findUnique({
    where: { id: session.userId },
    select: { branchId: true, role: true },
  });
  if (!actor) return { ok: false, error: "Сотрудник не найден" };

  const reservation = await prisma.reservation.findFirst({
    where: { id: reservationId, restaurantId: session.restaurantId },
    select: {
      id: true,
      code: true,
      branchId: true,
      assignedToId: true,
      status: true,
    },
  });
  if (!reservation) return { ok: false, error: "Бронь не найдена" };

  if (!canTransitionReservation(reservation.status, status)) {
    return {
      ok: false,
      error:
        reservation.status === "CANCELED"
          ? "Бронь отменена, её больше нельзя изменить"
          : reservation.status === "NO_SHOW"
            ? "Бронь закрыта как «гости не пришли»"
            : "Недопустимая смена статуса брони",
    };
  }

  if (
    session.role === "SENIOR_WAITER" &&
    reservation.branchId !== actor.branchId
  ) {
    return { ok: false, error: "Эта бронь другого филиала" };
  }

  const now = new Date();
  const changed = await prisma.$transaction(async (tx) => {
    const reservationChanged = await tx.reservation.updateMany({
      where: { id: reservation.id, status: reservation.status },
      data: {
        status,
        confirmedAt:
          status === "CONFIRMED" ? now : status === "PENDING" ? null : undefined,
        canceledAt:
          status === "CANCELED" || status === "NO_SHOW" ? now : undefined,
        assignedToId:
          reservation.assignedToId ??
          (session.role === "SENIOR_WAITER" ? session.userId : null),
      },
    });
    if (reservationChanged.count === 0) return false;

    if (status === "CANCELED" || status === "NO_SHOW") {
      await tx.reservationPreorder.updateMany({
        where: {
          reservationId: reservation.id,
          status: { not: "CANCELED" },
        },
        data: { status: "CANCELED", canceledAt: now },
      });
    }
    return true;
  });
  if (!changed) {
    return { ok: false, error: "Бронь уже обновлена другим сотрудником" };
  }

  await writeAudit({
    restaurantId: session.restaurantId,
    userId: session.userId,
    action: "reservation.status",
    entityType: "reservation",
    entityId: reservation.id,
    metadata: { from: reservation.status, to: status },
  });

  revalidatePath("/staff/reservations");
  revalidatePath("/my-reservations");
  revalidatePath(`/reservation/${reservation.code}`);
  return { ok: true };
}
