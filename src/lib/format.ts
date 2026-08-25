import type {
  OrderStatus,
  WaiterCallStatus,
  WaiterCallType,
} from "@prisma/client";

export function formatMoney(amount: number, currency = "₽"): string {
  return `${new Intl.NumberFormat("ru-RU").format(amount)}\u00a0${currency}`;
}

export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Подписи статусов для гостя. */
export const guestStatusLabel: Record<OrderStatus, string> = {
  NEW: "Отправлен официанту",
  ACCEPTED: "Официант принял заказ",
  SENT_TO_KITCHEN: "Передан на кухню",
  COMPLETED: "Выполнен",
  CANCELED: "Отменен",
};

/** Подписи статусов для персонала. */
export const staffStatusLabel: Record<OrderStatus, string> = {
  NEW: "Новый",
  ACCEPTED: "Принят",
  SENT_TO_KITCHEN: "На кухне",
  COMPLETED: "Выполнен",
  CANCELED: "Отменен",
};

export const statusBadgeClass: Record<OrderStatus, string> = {
  NEW: "bg-wine-600 text-white",
  ACCEPTED: "bg-amber-100 text-amber-800",
  SENT_TO_KITCHEN: "bg-sky-100 text-sky-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELED: "bg-cream-200 text-ink-500",
};

export const callStatusLabel: Record<WaiterCallStatus, string> = {
  NEW: "Новый",
  IN_PROGRESS: "В работе",
  CLOSED: "Закрыт",
};

export const callTypeLabel: Record<WaiterCallType, string> = {
  WAITER: "Позвать официанта",
  BILL: "Просьба счета",
  HELP: "Нужна помощь",
};

/** Сколько минут/секунд прошло с момента события. */
export function elapsedLabel(
  from: Date | string,
  now: number = Date.now(),
): string {
  const seconds = Math.max(
    0,
    Math.floor((now - new Date(from).getTime()) / 1000),
  );
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return `${seconds} с`;
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ч ${minutes % 60} мин`;
}

export function parseBadges(badges: string | null | undefined): string[] {
  if (!badges) return [];
  return badges
    .split(",")
    .map((badge) => badge.trim())
    .filter(Boolean);
}
