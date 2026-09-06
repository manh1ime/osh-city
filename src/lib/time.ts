/**
 * Единое время ресторана.
 *
 * Сервер может работать в любой зоне (в Docker это UTC), а кафе живёт по Москве.
 * Если границы суток считать через `new Date("2026-09-01T00:00:00")` или
 * `setHours(0,0,0,0)`, отчёты и нумерация заказов сдвигаются на несколько часов.
 * Все вычисления «начало дня», «конец дня» и «дата визита» идут только через
 * функции этого файла.
 *
 * Модуль client-safe: используется и в server components, и в браузере.
 */

export const RESTAURANT_TIME_ZONE = "Europe/Moscow";

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: RESTAURANT_TIME_ZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/** Настенные часы ресторана для указанного момента времени. */
export function restaurantWallClock(value: Date = new Date()): WallClock {
  const parts = partsFormatter.formatToParts(value);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: read("year"),
    month: read("month"),
    day: read("day"),
    // Intl в режиме hour12:false может отдать 24 для полуночи.
    hour: read("hour") % 24,
    minute: read("minute"),
    second: read("second"),
  };
}

/** Смещение зоны ресторана относительно UTC в миллисекундах. */
function zoneOffsetMs(value: Date): number {
  const wall = restaurantWallClock(value);
  const asUtc = Date.UTC(
    wall.year,
    wall.month - 1,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second,
  );
  // Секунды сравниваем без миллисекунд: Intl их не отдаёт.
  return asUtc - Math.floor(value.getTime() / 1000) * 1000;
}

/**
 * Настенное время ресторана -> точный момент времени (UTC).
 * Двойной проход нужен для зон с переходом на летнее время.
 */
export function restaurantTimeToDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): Date {
  const naive = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  const firstGuess = naive - zoneOffsetMs(new Date(naive));
  const corrected = naive - zoneOffsetMs(new Date(firstGuess));
  return new Date(corrected);
}

/** Дата в формате "2026-09-01" по времени ресторана. */
export function restaurantIsoDate(value: Date = new Date()): string {
  const wall = restaurantWallClock(value);
  return `${wall.year}-${String(wall.month).padStart(2, "0")}-${String(wall.day).padStart(2, "0")}`;
}

/** "ДДММ" для номера заказа по времени ресторана. */
export function restaurantOrderNumberPrefix(value: Date = new Date()): string {
  const wall = restaurantWallClock(value);
  return `${String(wall.day).padStart(2, "0")}${String(wall.month).padStart(2, "0")}`;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CLOCK_PATTERN = /^\d{2}:\d{2}$/;

/** Начало суток ресторана: 00:00:00.000 по Москве. */
export function restaurantStartOfDay(value: Date = new Date()): Date {
  const wall = restaurantWallClock(value);
  return restaurantTimeToDate(wall.year, wall.month, wall.day);
}

/** Конец суток ресторана: 23:59:59.999 по Москве. */
export function restaurantEndOfDay(value: Date = new Date()): Date {
  const start = restaurantStartOfDay(value);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Начало дня для даты из формы ("2026-09-01").
 * Возвращает null, если дата некорректна или не существует в календаре.
 */
export function restaurantStartOfIsoDate(isoDate: string): Date | null {
  if (!ISO_DATE_PATTERN.test(isoDate)) return null;
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day || month > 12 || day > 31) return null;
  const result = restaurantTimeToDate(year, month, day);
  // Отсекаем 31 февраля и подобные: после нормализации дата поменялась бы.
  if (restaurantIsoDate(result) !== isoDate) return null;
  return result;
}

/** Конец дня для даты из формы. */
export function restaurantEndOfIsoDate(isoDate: string): Date | null {
  const start = restaurantStartOfIsoDate(isoDate);
  if (!start) return null;
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/**
 * Интервал [gte, lte] для одной даты ресторана. Используется фильтрами отчётов.
 */
export function restaurantDayRange(
  isoDate: string,
): { gte: Date; lte: Date } | null {
  const gte = restaurantStartOfIsoDate(isoDate);
  const lte = restaurantEndOfIsoDate(isoDate);
  if (!gte || !lte) return null;
  return { gte, lte };
}

/** Полуинтервал [gte, lt) для одной даты ресторана. */
export function restaurantDayBounds(
  isoDate: string,
): { gte: Date; lt: Date } | null {
  const gte = restaurantStartOfIsoDate(isoDate);
  if (!gte) return null;
  return { gte, lt: new Date(gte.getTime() + 24 * 60 * 60 * 1000) };
}

/** Сдвиг даты "2026-09-01" на N дней в календаре ресторана. */
export function shiftRestaurantIsoDate(isoDate: string, days: number): string {
  const start = restaurantStartOfIsoDate(isoDate);
  if (!start) return isoDate;
  return restaurantIsoDate(new Date(start.getTime() + days * 24 * 60 * 60 * 1000));
}

/** Сегодняшняя дата ресторана, сдвинутая на N дней. */
export function restaurantIsoDateOffset(days: number): string {
  return shiftRestaurantIsoDate(restaurantIsoDate(), days);
}

/**
 * Дата и время из формы -> момент времени по часам ресторана.
 * "2026-09-01" + "19:30" всегда означает 19:30 в Москве, независимо от
 * зоны сервера и браузера гостя.
 */
export function restaurantDateTime(isoDate: string, clock: string): Date | null {
  if (!ISO_DATE_PATTERN.test(isoDate) || !CLOCK_PATTERN.test(clock)) return null;
  const [year, month, day] = isoDate.split("-").map(Number);
  const [hour, minute] = clock.split(":").map(Number);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour > 23 ||
    minute > 59
  ) {
    return null;
  }
  if (restaurantStartOfIsoDate(isoDate) === null) return null;
  return restaurantTimeToDate(year, month, day, hour, minute);
}
