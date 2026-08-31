/** Гостевое бронирование: общие правила для сервера и клиента. */
export const RESERVATION_LIMITS = {
  minGuests: 1,
  /** За столом 4 посадочных места. Большая компания сажается только на сдвоенные столы вручную. */
  maxGuests: 4,
  /** Столов в каждом филиале. */
  tablesPerBranch: 12,
  /** Сколько дней показывать в списке дат. */
  dateOptionsCount: 14,
  nameMax: 80,
  commentMax: 300,
  /** На сколько дней вперёд можно бронировать стол. */
  maxDaysAhead: 60,
  /** Шаг сетки времени в минутах. */
  slotStepMinutes: 30,
  /** Бронь принимается минимум за столько минут до визита. */
  minLeadMinutes: 30,
} as const;

/** Алфавит кода брони: без похожих символов (0/O, 1/I, 5/S, B/8, 2/Z, 6/G).
 *  Сама генерация живёт в src/actions/reservations.ts: этот файл импортируется
 *  клиентским компонентом и не должен тянуть node:crypto в браузерный бандл. */
export const RESERVATION_CODE_ALPHABET = "ACDEFGHJKLMNPQRTUVWXY3479";
export const RESERVATION_CODE_LENGTH = 6;

function toMinutes(time: string): number {
  if (!/^\d{2}:\d{2}$/.test(time)) return -1;
  const [hours, minutes] = time.split(":").map((part) => Number(part));
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours > 23 ||
    minutes > 59
  ) {
    return -1;
  }
  return hours * 60 + minutes;
}

function toTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const rest = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

/**
 * Сетка времени внутри рабочих часов филиала.
 * Последний слот ставим за час до закрытия, чтобы гость успел поесть.
 */
export function buildTimeSlots(openTime: string, closeTime: string): string[] {
  const start = toMinutes(openTime);
  const rawEnd = toMinutes(closeTime);
  if (start < 0 || rawEnd < 0) return [];
  const end = (rawEnd <= start ? rawEnd + 24 * 60 : rawEnd) - 60;
  const slots: string[] = [];
  for (
    let minute = start;
    minute <= end;
    minute += RESERVATION_LIMITS.slotStepMinutes
  ) {
    slots.push(toTimeString(minute));
  }
  return slots;
}

/**
 * Круглосуточный филиал: открытие в 00:00 и закрытие в 23:59 или 00:00.
 * Для таких филиалов гость выбирает любое время с точностью до минуты.
 */
export function isRoundTheClock(openTime: string, closeTime: string): boolean {
  const start = toMinutes(openTime);
  const end = toMinutes(closeTime);
  return start === 0 && (end === 0 || end >= 23 * 60 + 59);
}

export function workingHoursLabel(
  openTime: string,
  closeTime: string,
): string {
  return isRoundTheClock(openTime, closeTime)
    ? "Круглосуточно"
    : `Ежедневно с ${openTime} до ${closeTime}`;
}

/** Время визита в рабочих часах. У круглосуточного филиала подходит любое. */
export function isTimeWithinWorkingHours(
  time: string,
  openTime: string,
  closeTime: string,
): boolean {
  const value = toMinutes(time);
  const start = toMinutes(openTime);
  const rawEnd = toMinutes(closeTime);
  if (value < 0 || start < 0 || rawEnd < 0) return false;
  if (isRoundTheClock(openTime, closeTime)) return true;

  const lastSlot = (rawEnd <= start ? rawEnd + 24 * 60 : rawEnd) - 60;
  if (lastSlot < start) return false;
  // Закрытие после полуночи: интервал переходит через сутки.
  if (rawEnd <= start) return value >= start || value <= rawEnd - 60;
  return value >= start && value <= lastSlot;
}

/** Дата и время из формы -> Date. Значения приходят строками "2026-09-01" и "19:30". */
export function combineDateAndTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (toMinutes(time) < 0) return null;
  const parsed = new Date(`${date}T${time}:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  // JS normalizes invalid calendar dates (for example 2026-02-31), reject them.
  const [year, month, day] = date.split("-").map(Number);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() + 1 !== month ||
    parsed.getDate() !== day ||
    parsed.getHours() !== Number(time.slice(0, 2)) ||
    parsed.getMinutes() !== Number(time.slice(3, 5))
  ) {
    return null;
  }
  return parsed;
}

export function formatReservationDate(value: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "numeric",
    month: "long",
    weekday: "short",
  }).format(value);
}

export function formatReservationTime(value: Date): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export type DateOption = {
  /** Значение для формы: "2026-09-01". */
  value: string;
  /** "сегодня", "завтра" или "вт". */
  weekday: string;
  day: string;
  month: string;
  longLabel: string;
  isWeekend: boolean;
};

function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Список ближайших дат для выбора карточками вместо календаря.
 * Никаких серверных зависимостей: функция вызывается и на клиенте.
 */
export function buildDateOptions(
  count: number = RESERVATION_LIMITS.dateOptionsCount,
): DateOption[] {
  const options: DateOption[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);

  for (let offset = 0; offset < count; offset += 1) {
    const current = new Date(base);
    current.setDate(base.getDate() + offset);
    const weekdayShort = new Intl.DateTimeFormat("ru-RU", {
      weekday: "short",
    }).format(current);

    options.push({
      value: toIsoDate(current),
      weekday:
        offset === 0 ? "сегодня" : offset === 1 ? "завтра" : weekdayShort,
      day: String(current.getDate()),
      month: new Intl.DateTimeFormat("ru-RU", { month: "short" })
        .format(current)
        .replace(".", ""),
      longLabel: new Intl.DateTimeFormat("ru-RU", {
        day: "numeric",
        month: "long",
        weekday: "long",
      }).format(current),
      isWeekend: current.getDay() === 0 || current.getDay() === 6,
    });
  }

  return options;
}

export function guestsLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} гость`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return `${count} гостя`;
  return `${count} гостей`;
}
