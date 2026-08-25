import { z } from "zod";

/** Лимиты гостевого заказа (техзадание раздел 6.3). */
export const ORDER_LIMITS = {
  itemCommentMax: 150,
  orderCommentMax: 300,
  maxQuantityPerItem: 20,
  maxPositions: 50,
} as const;

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
      value.startsWith("/images/") ||
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
  description: plainText(400).optional().nullable(),
  ingredients: plainText(400).optional().nullable(),
  allergens: plainText(200).optional().nullable(),
  price: z.coerce.number().int().min(0).max(1_000_000),
  weight: plainText(40).optional().nullable(),
  imageUrl: imageLocation.optional(),
  badges: plainText(120).optional().nullable(),
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
  number: z.coerce.number().int().min(1).max(9999),
  zone: plainText(60).optional().nullable(),
  isActive: z.coerce.boolean().default(true),
});

export const staffSchema = z.object({
  id: cuidLike.optional(),
  name: plainText(80).refine((value) => value.length > 1, "Укажите имя"),
  email: z.string().email("Некорректный email").max(120),
  role: z.enum(["WAITER", "MANAGER"]),
  password: z
    .string()
    .min(6, "Минимум 6 символов")
    .max(72)
    .optional()
    .or(z.literal("")),
  isActive: z.coerce.boolean().default(true),
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

export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Некорректные данные";
}
