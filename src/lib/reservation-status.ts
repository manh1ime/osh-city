/**
 * Единые правила статусов брони и предзаказа.
 *
 * Раньше таблица переходов жила на сервере (src/actions/reservations.ts), а
 * кнопки в панели персонала решали через набор `status !== "..."`. Наборы
 * расходились: у отменённой брони оставались кнопки «Подтвердить», «Гости за
 * столом» и «Не пришли», сервер их отклонял, и сотрудник видел ошибку вместо
 * недоступной кнопки.
 *
 * Модуль client-safe: без "server-only" и без node-зависимостей, поэтому
 * один и тот же список переходов используют и server action, и компонент.
 */

export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SEATED"
  | "CANCELED"
  | "NO_SHOW";

export type PreorderStatus =
  | "NEW"
  | "CONFIRMED"
  | "IN_KITCHEN"
  | "READY"
  | "CANCELED";

/**
 * Разрешённые переходы брони.
 * CANCELED и NO_SHOW — финальные: бронь уже нельзя вернуть в работу,
 * иначе гость получил бы подтверждение по отменённой им же брони.
 */
export const RESERVATION_TRANSITIONS: Record<
  ReservationStatus,
  readonly ReservationStatus[]
> = {
  PENDING: ["CONFIRMED", "SEATED", "CANCELED", "NO_SHOW"],
  CONFIRMED: ["SEATED", "CANCELED", "NO_SHOW"],
  SEATED: ["NO_SHOW"],
  CANCELED: [],
  NO_SHOW: [],
};

/** Разрешённые переходы предзаказа. READY и CANCELED — финальные. */
export const PREORDER_TRANSITIONS: Record<
  PreorderStatus,
  readonly PreorderStatus[]
> = {
  NEW: ["CONFIRMED", "CANCELED"],
  CONFIRMED: ["IN_KITCHEN", "CANCELED"],
  IN_KITCHEN: ["READY"],
  READY: [],
  CANCELED: [],
};

export function canTransitionReservation(
  from: ReservationStatus,
  to: ReservationStatus,
): boolean {
  return RESERVATION_TRANSITIONS[from].includes(to);
}

export function canTransitionPreorder(
  from: PreorderStatus,
  to: PreorderStatus,
): boolean {
  return PREORDER_TRANSITIONS[from].includes(to);
}

/** Бронь закрыта: действий по ней больше нет. */
export function isReservationFinal(status: ReservationStatus): boolean {
  return RESERVATION_TRANSITIONS[status].length === 0;
}

/** Предзаказ закрыт: действий по нему больше нет. */
export function isPreorderFinal(status: PreorderStatus): boolean {
  return PREORDER_TRANSITIONS[status].length === 0;
}
