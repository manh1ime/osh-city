import "server-only";

import { prisma } from "./db";
import { formatMoney } from "./format";
import { formatReservationDate, formatReservationTime, guestsLabel } from "./reservations";
import { callTypeLabel } from "./format";
import { recipientsForEvent, sendPushToUsers } from "./push";

/**
 * Отправка push в момент события.
 *
 * Раньше уведомление появлялось только когда открытая панель опрашивала
 * сервер, поэтому телефон с закрытым браузером молчал. Здесь push уходит
 * сразу при создании заказа, вызова, брони или предзаказа.
 *
 * Любая ошибка гасится: гость не должен получить отказ в заказе из-за того,
 * что push-сервис недоступен.
 */

/** Гость отправил заказ со столика. Видят все сотрудники филиала. */
export async function pushNewOrder(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        totalAmount: true,
        restaurantId: true,
        table: {
          select: { number: true, zone: true, branchId: true },
        },
        restaurant: { select: { currency: true } },
      },
    });
    if (!order) return;

    const recipients = await recipientsForEvent({
      restaurantId: order.restaurantId,
      branchId: order.table.branchId,
      kind: "order",
    });
    const zone = order.table.zone ? ` · ${order.table.zone}` : "";

    await sendPushToUsers(recipients, {
      title: `Новый заказ № ${order.orderNumber}`,
      body: `Стол ${order.table.number}${zone} · ${formatMoney(order.totalAmount, order.restaurant.currency)}`,
      url: `/staff/orders/${order.id}`,
      tag: `order:${order.id}:NEW`,
      urgency: "high",
    });
  } catch (error) {
    console.error("PUSH_NEW_ORDER_FAILED", error);
  }
}

/** Гость позвал официанта или попросил счёт. */
export async function pushNewCall(callId: string): Promise<void> {
  try {
    const call = await prisma.waiterCall.findUnique({
      where: { id: callId },
      select: {
        id: true,
        type: true,
        message: true,
        restaurantId: true,
        table: { select: { number: true, zone: true, branchId: true } },
      },
    });
    if (!call) return;

    const recipients = await recipientsForEvent({
      restaurantId: call.restaurantId,
      branchId: call.table.branchId,
      kind: "call",
    });
    const zone = call.table.zone ? ` · ${call.table.zone}` : "";

    await sendPushToUsers(recipients, {
      title: `${callTypeLabel[call.type]} · стол ${call.table.number}`,
      body: call.message ?? `Гость ждёт официанта${zone}`,
      url: "/staff/calls",
      tag: `call:${call.id}:NEW`,
      urgency: "high",
    });
  } catch (error) {
    console.error("PUSH_NEW_CALL_FAILED", error);
  }
}

/** Гость забронировал стол. Видят старшие официанты филиала и менеджер. */
export async function pushNewReservation(reservationId: string): Promise<void> {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: {
        code: true,
        guestName: true,
        guestsCount: true,
        reservedAt: true,
        branchId: true,
        restaurantId: true,
        branch: { select: { name: true } },
      },
    });
    if (!reservation) return;

    const recipients = await recipientsForEvent({
      restaurantId: reservation.restaurantId,
      branchId: reservation.branchId,
      kind: "reservation",
    });

    await sendPushToUsers(recipients, {
      title: `Новая бронь ${reservation.code}`,
      body: `${reservation.guestName} · ${guestsLabel(reservation.guestsCount)} · ${formatReservationDate(reservation.reservedAt)} в ${formatReservationTime(reservation.reservedAt)} · ${reservation.branch.name}`,
      url: "/staff/reservations",
      tag: `reservation:${reservationId}:PENDING`,
      urgency: "high",
    });
  } catch (error) {
    console.error("PUSH_NEW_RESERVATION_FAILED", error);
  }
}

/** Гость оформил предзаказ к своей брони. */
export async function pushNewPreorder(preorderId: string): Promise<void> {
  try {
    const preorder = await prisma.reservationPreorder.findUnique({
      where: { id: preorderId },
      select: {
        id: true,
        preorderNumber: true,
        totalAmount: true,
        timing: true,
        restaurantId: true,
        restaurant: { select: { currency: true } },
        reservation: {
          select: {
            code: true,
            guestName: true,
            reservedAt: true,
            branchId: true,
          },
        },
      },
    });
    if (!preorder) return;

    const recipients = await recipientsForEvent({
      restaurantId: preorder.restaurantId,
      branchId: preorder.reservation.branchId,
      kind: "preorder",
    });

    const timing =
      preorder.timing === "PREPARE_AFTER_SEATING"
        ? " · готовить после посадки"
        : " · подать сразу после прихода";

    await sendPushToUsers(recipients, {
      title: `Новый предзаказ № ${preorder.preorderNumber}`,
      body: `${preorder.reservation.guestName} · бронь ${preorder.reservation.code} на ${formatReservationTime(preorder.reservation.reservedAt)} · ${formatMoney(preorder.totalAmount, preorder.restaurant.currency)}${timing}`,
      url: "/staff/reservations",
      tag: `preorder:${preorder.id}:NEW`,
      urgency: "high",
    });
  } catch (error) {
    console.error("PUSH_NEW_PREORDER_FAILED", error);
  }
}

/** Предзаказ готов: старшему официанту нужно подать блюда. */
export async function pushPreorderReady(preorderId: string): Promise<void> {
  try {
    const preorder = await prisma.reservationPreorder.findUnique({
      where: { id: preorderId },
      select: {
        id: true,
        preorderNumber: true,
        restaurantId: true,
        reservation: {
          select: { code: true, guestName: true, branchId: true },
        },
      },
    });
    if (!preorder) return;

    const recipients = await recipientsForEvent({
      restaurantId: preorder.restaurantId,
      branchId: preorder.reservation.branchId,
      kind: "preorder",
    });

    await sendPushToUsers(recipients, {
      title: `Предзаказ № ${preorder.preorderNumber} готов`,
      body: `${preorder.reservation.guestName} · бронь ${preorder.reservation.code} · можно подавать`,
      url: "/staff/reservations",
      tag: `preorder:${preorder.id}:READY`,
      urgency: "normal",
    });
  } catch (error) {
    console.error("PUSH_PREORDER_READY_FAILED", error);
  }
}
