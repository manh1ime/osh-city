import { z } from "zod";

/** Лимиты гостевого заказа (техзадание раздел 6.3). */
export const ORDER_LIMITS = {
  itemCommentMax: 150,
  orderCommentMax: 300,
  maxQuantityPerItem: 20,
  maxPositions: 50,
} as const;

/**
 * Российский телефон: принимаем визуальные пробелы, скобки и дефисы,
 * но храним только нормализованный вид "+79990009900".
 * Требования: +7 и ровно 10 цифр после него.
 */
export const RUSSIAN_PHONE_REGEX = /^\+7\d{10}$/;

/** Убирает всё, кроме цифр, и нормализует в формат "+7XXXXXXXXXX". */
export function normalizeRussianPhone(value: string): string {
  const digits = value.replace(/[^\d]/g, "");
  if (digits.length === 11 && digits.startsWith("7")) {
    return `+${digits}`;
  }
  return digits ? `+${digits}` : "";
}

/** Один и тот же телефон в любом вводе сравнивается одинаково. */
export function samePhone(a: string, b: string): boolean {
  return normalizeRussianPhone(a) === normalizeRussianPhone(b);
}

export function isValidRussianPhone(value: string): boolean {
  return RUSSIAN_PHONE_REGEX.test(normalizeRussianPhone(value));
}

/** Валидатор телефона для zod: нормализует перед сохранением. */
const russianPhone = z
  .string()
  .max(30)
  .refine(
    (value) => /^\+7[\d\s()\-]{10,24}$/.test(value),
    "Укажите российский номер в формате +7 900 000-00-00",
  )
  .transform((value) => {
    // Разрешаем только визуальные разделители, но на сервере храним чистый вид.
    return normalizeRussianPhone(value.replace(/[\s()\-]/g, ""));
  })
  .refine((value) => RUSSIAN_PHONE_REGEX.test(value), {
    message: "Укажите российский номер в формате +7 900 000-00-00",
  });

/** Защита от XSS/инъекций: сохраняем только плоский текст без тегов. */
export function sanitizeText(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[<>]/g, "")
    .replace(/\u0000/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const plainText = (max: number) =>
  z
    .string()
    .max(max * 2)
    .transform(sanitizeText)
    .refine((value) => value.length <= max, {
      message: `Максимум ${max} символов`,
    });

const imageLocation = z
  .string()
  .max(700_000)
  .refine(
    (value) =>
      value === "" ||
      /^\/[a-zA-Z0-9/_\-.%]+$/.test(value) ||
      /^data:image\/(png|jpeg|webp);base64,/.test(value) ||
      z.string().url().safeParse(value).success,
    "Нужна ссылка на изображение",
  );

export const cuidLike = z
  .string()
  .min(6)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, "Некорректный id");

/** Цена С КЛИЕНТА НЕ ПРИНИМАЕТСЯ: в схеме нет поля price. */
export const createOrderSchema = z.object({
  tableToken: z.string().min(8).max(80),
  comment: plainText(ORDER_LIMITS.orderCommentMax).optional().nullable(),
  items: z
    .array(
      z.object({
        menuItemId: cuidLike,
        quantity: z.number().int().min(1).max(ORDER_LIMITS.maxQuantityPerItem),
        comment: plainText(ORDER_LIMITS.itemCommentMax).optional().nullable(),
      }),
    )
    .min(1, "Корзина пуста")
    .max(
      ORDER_LIMITS.maxPositions,
      `Максимум ${ORDER_LIMITS.maxPositions} позиций в заказе`,
    ),
});
export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/** Предзаказ блюд к бронированию. Цена также никогда не принимается с клиента. */
export const createReservationPreorderSchema = z.object({
  reservationCode: z
    .string()
    .trim()
    .toUpperCase()
    .min(6)
    .max(12)
    .regex(/^[A-Z0-9]+$/, "Некорректный код брони"),
  timing: z.enum(["SERVE_ON_ARRIVAL", "PREPARE_AFTER_SEATING"]),
  comment: plainText(ORDER_LIMITS.orderCommentMax).optional().nullable(),
  items: z
    .array(
      z.object({
        menuItemId: cuidLike,
        quantity: z.number().int().min(1).max(ORDER_LIMITS.maxQuantityPerItem),
        comment: plainText(ORDER_LIMITS.itemCommentMax).optional().nullable(),
      }),
    )
    .min(1, "Корзина пуста")
    .max(
      ORDER_LIMITS.maxPositions,
      `Максимум ${ORDER_LIMITS.maxPositions} позиций в заказе`,
    ),
});

export const waiterCallSchema = z.object({
  tableToken: z.string().min(8).max(80),
  type: z.enum(["WAITER", "BILL", "HELP"]).default("WAITER"),
  message: plainText(200).optional().nullable(),
});

export const loginSchema = z.object({
  email: z.string().email("Некорректный email").max(120),
  password: z.string().min(4, "Минимум 4 символа").max(72),
});

export const menuItemSchema = z.object({
  id: cuidLike.optional(),
  categoryId: cuidLike,
  name: plainText(120).refine((value) => value.length > 1, "Укажите название"),
  description: plainText(1000).optional().nullable(),
  ingredients: plainText(2000).optional().nullable(),
  allergens: plainText(1000).optional().nullable(),
  price: z.coerce.number().int().min(0).max(1_000_000),
  weight: plainText(40).optional().nullable(),
  imageUrl: imageLocation.optional(),
  badges: plainText(300).optional().nullable(),
  isActive: z.coerce.boolean().default(true),
  isStopListed: z.coerce.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const categorySchema = z.object({
  id: cuidLike.optional(),
  name: plainText(80).refine((value) => value.length > 1, "Укажите название"),
  description: plainText(200).optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
  isActive: z.coerce.boolean().default(true),
});

export const tableSchema = z.object({
  id: cuidLike.optional(),
  branchId: cuidLike,
  number: z.coerce.number().int().min(1).max(9999),
  zone: plainText(60).optional().nullable(),
  isActive: z.coerce.boolean().default(true),
});

export const staffSchema = z.object({
  id: cuidLike.optional(),

  name: plainText(80).refine(
    (value) => value.length > 1,
    "Укажите имя",
  ),

  email: z.string().email("Некорректный email").max(120),

  role: z.enum([
    "WAITER",
    "SENIOR_WAITER",
    "MANAGER",
  ]),

  branchId: z
    .union([cuidLike, z.literal("")])
    .optional()
    .transform((value) => (value ? value : null)),

  password: z
    .string()
    .min(6, "Минимум 6 символов")
    .max(72)
    .optional()
    .or(z.literal("")),

  isActive: z.coerce.boolean().default(true),

  isNightShift: z.coerce.boolean().default(false),
});

export const settingsSchema = z.object({
  name: plainText(120).refine((value) => value.length > 1, "Укажите название"),
  description: plainText(300).optional().nullable(),
  address: plainText(200).optional().nullable(),
  logoUrl: imageLocation.optional(),
  coverImageUrl: imageLocation.optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Цвет в формате #RRGGBB"),
  currency: plainText(6).refine((value) => value.length > 0, "Укажите валюту"),
  isOrderingEnabled: z.coerce.boolean().default(true),
});

export const securitySettingsSchema = z.object({
  duplicateOrderWindowSec: z.coerce.number().int().min(0).max(3600),
  maxOrdersPerWindow: z.coerce.number().int().min(1).max(100),
  orderWindowMinutes: z.coerce.number().int().min(1).max(120),
  maxCallsPerWindow: z.coerce.number().int().min(1).max(100),
  callWindowMinutes: z.coerce.number().int().min(1).max(120),
  requireWaiterConfirmation: z.coerce.boolean().default(true),
  qrTokenLength: z.coerce.number().int().min(10).max(40),
});

/** Гостевое бронирование стола с лендинга. */
export const reservationSchema = z.object({
  branchSlug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Некорректный филиал"),
  name: plainText(80).refine((value) => value.length > 1, "Укажите имя"),
  phone: russianPhone,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Выберите дату"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Выберите время"),
  // За столом 4 посадочных места.
  guests: z.coerce
    .number()
    .int()
    .min(1, "Минимум 1 гость")
    .max(4, "За столом 4 места. Для большей компании оставьте комментарий"),
  comment: plainText(300).optional().nullable(),
});
export type ReservationInput = z.infer<typeof reservationSchema>;

/** Поиск своих броней: гость вводит телефон, по которому бронировал. */
export const reservationLookupSchema = z.object({
  phone: russianPhone,
});

/** Смена статуса брони со стороны старшего официанта. */
export const reservationStatusSchema = z.object({
  reservationId: cuidLike,
  status: z.enum(["PENDING", "CONFIRMED", "SEATED", "CANCELED", "NO_SHOW"]),
});

export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Некорректные данные";
}
