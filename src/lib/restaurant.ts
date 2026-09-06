import { prisma } from "./db";

/**
 * Система работает для ОДНОГО ресторана (single-tenant),
 * но все запросы уже идут с restaurantId: мультиарендность включается без переписывания логики.
 */
export const RESTAURANT_SLUG = process.env.RESTAURANT_SLUG ?? "osh-city";

export async function getRestaurant() {
  const restaurant =
    (await prisma.restaurant.findUnique({
      where: { slug: RESTAURANT_SLUG },
    })) ??
    (await prisma.restaurant.findFirst({ orderBy: { createdAt: "asc" } }));
  if (!restaurant) {
    throw new Error("Ресторан не найден в базе. Запустите `npm run db:seed`.");
  }
  return restaurant;
}

export async function getSecuritySettings(restaurantId: string) {
  const existing = await prisma.securitySetting.findUnique({
    where: { restaurantId },
  });
  if (existing) return existing;
  return prisma.securitySetting.create({ data: { restaurantId } });
}

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    "",
  );
}

export function tableMenuUrl(token: string): string {
  return `${appUrl()}/menu/${token}`;
}
