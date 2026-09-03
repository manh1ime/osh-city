import "server-only";

import { prisma } from "./db";
import type { SessionRole } from "./session-token";
import {
  formatReservationDate,
  formatReservationTime,
  guestsLabel,
} from "./reservations";
import { callTypeLabel, formatMoney, formatTime } from "./format";

/**
 * Лента уведомлений для персонала.
 *
 * Сознательно НЕ вводим отдельную таблицу уведомлений: все события уже есть в
 * базе (новый заказ = Order.status NEW, новая бронь = Reservation.status
 * PENDING, вызов = WaiterCall.status NEW, предзаказ = ReservationPreorder.status
 * NEW). Отдельная таблица потребовала бы миграции на работающем проде и создала
 * бы второй источник правды, который может разойтись с реальными статусами.
 *
 * «Прочитано» хранится на клиенте (метка времени последнего просмотра), потому
 * что это операционный сигнал смены, а не переписка: после закрытия заказа
 * уведомление и так исчезает из ленты.
 */

export type StaffNotificationKind =
  | "ORDER_NEW"
  | "ORDER_WAITING"
  | "CALL_NEW"
  | "RESERVATION_NEW"
  | "PREORDER_NEW"
  | "PREORDER_READY";

export type StaffNotification = {
  /** Стабильный id: одно и то же событие не должно звучать дважды. */
  id: string;
  kind: StaffNotificationKind;
  title: string;
  body: string;
  /** Куда ведёт клик по уведомлению. */
  href: string;
  /** ISO-время события: клиент сам считает «сколько ждёт». */
  createdAt: string;
  /** high — требует реакции сейчас (звук + push), normal — только в списке. */
  urgency: "high" | "normal";
};

export type StaffNotificationsPayload = {
  ok: true;
  notifications: StaffNotification[];
  serverTime: number;
  /** Что именно доступно этой роли: клиент показывает честный пустой экран. */
  scope: {
    orders: boolean;
    calls: boolean;
    reservations: boolean;
    branchName: string | null;
  };
};

/** Заказ, который ждёт подтверждения дольше этого времени, повышаем в приоритете. */
const ORDER_WAITING_ALERT_MS = 2 * 60 * 1000;
/** Насколько назад смотрим события: смена, а не вся история. */
const LOOKBACK_MS = 12 * 60 * 60 * 1000;
/** Брони показываем заранее: старшему официанту нужно успеть подготовить стол. */
const RESERVATION_AHEAD_MS = 24 * 60 * 60 * 1000;
const MAX_NOTIFICATIONS = 40;

/** Кто какие уведомления получает. */
export function notificationScope(role: SessionRole) {
  return {
    orders: true,
    calls: true,
    // Бронями и предзаказами занимается старший официант, официант их не ведёт.
    reservations: role === "SENIOR_WAITER" || role === "MANAGER",
  };
}

export async function getStaffNotifications(input: {
  restaurantId: string;
  userId: string;
  role: SessionRole;
  currency: string;
}): Promise<StaffNotificationsPayload> {
  const scope = notificationScope(input.role);
  const now = Date.now();
  const since = new Date(now - LOOKBACK_MS);

  const staff = await prisma.staffUser.findUnique({
    where: { id: input.userId },
    select: { branchId: true, branch: { select: { name: true } } },
  });

  // Менеджер видит оба филиала. Сотрудник без филиала не должен видеть чужие
  // столы, поэтому вместо «всех» ему отдаём пустую выборку.
  const isBranchStaff = input.role !== "MANAGER";
  const branchId = isBranchStaff ? staff?.branchId ?? null : null;
  const branchLocked = isBranchStaff && !branchId;

  const [orders, calls, reservations, preorders] = await Promise.all([
    branchLocked
      ? []
      : prisma.order.findMany({
          where: {
            restaurantId: input.restaurantId,
            status: { in: ["NEW", "SENT_TO_KITCHEN"] },
            createdAt: { gte: since },
            ...(branchId ? { table: { branchId } } : {}),
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            table: { select: { number: true, zone: true } },
          },
          orderBy: { createdAt: "desc" },
          take: MAX_NOTIFICATIONS,
        }),
    branchLocked
      ? []
      : prisma.waiterCall.findMany({
          where: {
            restaurantId: input.restaurantId,
            status: { in: ["NEW", "IN_PROGRESS"] },
            createdAt: { gte: since },
            ...(branchId ? { table: { branchId } } : {}),
          },
          select: {
            id: true,
            type: true,
            status: true,
            message: true,
            createdAt: true,
            table: { select: { number: true, zone: true } },
          },
          orderBy: { createdAt: "desc" },
          take: MAX_NOTIFICATIONS,
        }),
    !scope.reservations || branchLocked
      ? []
      : prisma.reservation.findMany({
          where: {
            restaurantId: input.restaurantId,
            status: "PENDING",
            reservedAt: { lte: new Date(now + RESERVATION_AHEAD_MS) },
            createdAt: { gte: since },
            ...(branchId ? { branchId } : {}),
          },
          select: {
            id: true,
            code: true,
            guestName: true,
            guestsCount: true,
            reservedAt: true,
            createdAt: true,
            branch: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: MAX_NOTIFICATIONS,
        }),
    !scope.reservations || branchLocked
      ? []
      : prisma.reservationPreorder.findMany({
          where: {
            restaurantId: input.restaurantId,
            status: { in: ["NEW", "READY"] },
            createdAt: { gte: since },
            ...(branchId ? { reservation: { branchId } } : {}),
          },
          select: {
            id: true,
            preorderNumber: true,
            status: true,
            timing: true,
            totalAmount: true,
            createdAt: true,
            reservation: {
              select: { code: true, guestName: true, reservedAt: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: MAX_NOTIFICATIONS,
        }),
  ]);

  const notifications: StaffNotification[] = [];

  for (const order of orders) {
    const zone = order.table.zone ? ` · ${order.table.zone}` : "";
    if (order.status === "NEW") {
      const waitingMs = now - order.createdAt.getTime();
      const late = waitingMs >= ORDER_WAITING_ALERT_MS;
      notifications.push({
        // Статус в id: когда заказ «залежался», это новое событие для звука.
        id: `order:${order.id}:${late ? "WAITING" : "NEW"}`,
        kind: late ? "ORDER_WAITING" : "ORDER_NEW",
        title: late
          ? `Заказ № ${order.orderNumber} долго не принят`
          : `Новый заказ № ${order.orderNumber}`,
        body: `Стол ${order.table.number}${zone} · ${formatMoney(order.totalAmount, input.currency)}`,
        href: `/staff/orders/${order.id}`,
        createdAt: order.createdAt.toISOString(),
        urgency: "high",
      });
      continue;
    }
    notifications.push({
      id: `order:${order.id}:KITCHEN`,
      kind: "ORDER_NEW",
      title: `Заказ № ${order.orderNumber} на кухне`,
      body: `Стол ${order.table.number}${zone} · отправлен в ${formatTime(order.createdAt)}`,
      href: `/staff/orders/${order.id}`,
      createdAt: order.createdAt.toISOString(),
      urgency: "normal",
    });
  }

  for (const call of calls) {
    const zone = call.table.zone ? ` · ${call.table.zone}` : "";
    notifications.push({
      id: `call:${call.id}:${call.status}`,
      kind: "CALL_NEW",
      title: `${callTypeLabel[call.type]} · стол ${call.table.number}`,
      body: call.message
        ? call.message
        : call.status === "NEW"
          ? `Гость ждёт официанта${zone}`
          : `Вызов в работе${zone}`,
      href: "/staff/calls",
      createdAt: call.createdAt.toISOString(),
      urgency: call.status === "NEW" ? "high" : "normal",
    });
  }

  for (const reservation of reservations) {
    notifications.push({
      id: `reservation:${reservation.id}:PENDING`,
      kind: "RESERVATION_NEW",
      title: `Новая бронь ${reservation.code}`,
      body: `${reservation.guestName} · ${guestsLabel(reservation.guestsCount)} · ${formatReservationDate(reservation.reservedAt)} в ${formatReservationTime(reservation.reservedAt)}`,
      href: "/staff/reservations",
      createdAt: reservation.createdAt.toISOString(),
      urgency: "high",
    });
  }

  for (const preorder of preorders) {
    const isReady = preorder.status === "READY";
    notifications.push({
      id: `preorder:${preorder.id}:${preorder.status}`,
      kind: isReady ? "PREORDER_READY" : "PREORDER_NEW",
      title: isReady
        ? `Предзаказ № ${preorder.preorderNumber} готов`
        : `Новый предзаказ № ${preorder.preorderNumber}`,
      body: `${preorder.reservation.guestName} · бронь ${preorder.reservation.code} на ${formatReservationTime(preorder.reservation.reservedAt)} · ${formatMoney(preorder.totalAmount, input.currency)}${
        preorder.timing === "PREPARE_AFTER_SEATING" && !isReady
          ? " · готовить после посадки"
          : ""
      }`,
      href: "/staff/reservations",
      createdAt: preorder.createdAt.toISOString(),
      urgency: isReady ? "normal" : "high",
    });
  }

  notifications.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return {
    ok: true,
    notifications: notifications.slice(0, MAX_NOTIFICATIONS),
    serverTime: now,
    scope: {
      ...scope,
      branchName: isBranchStaff ? (staff?.branch?.name ?? null) : null,
    },
  };
}
