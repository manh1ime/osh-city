import "server-only";
import type { GuestCategoryDto } from "@/components/guest/GuestMenu";
import { prisma } from "./db";
import { parseBadges } from "./format";

/** Гостевое меню: активные категории + активные блюда (стоп-лист помечен, но виден). */
export async function getGuestMenu(restaurantId: string) {
  const categories = await prisma.category.findMany({
    where: { restaurantId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      menuItems: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
    },
  });
  return categories.filter((category) => category.menuItems.length > 0);
}

export type GuestMenuCategory = Awaited<
  ReturnType<typeof getGuestMenu>
>[number];
export type GuestMenuItem = GuestMenuCategory["menuItems"][number];

/**
 * Единый маппер меню для всех гостевых экранов (стол по QR, предзаказ к брони,
 * публичный просмотр). Благодаря нему все блюда из меню менеджера попадают
 * в гостевое меню без расхождений между страницами.
 */
export function toGuestMenuDto(
  categories: GuestMenuCategory[],
): GuestCategoryDto[] {
  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    items: category.menuItems.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      ingredients: item.ingredients,
      allergens: item.allergens,
      price: item.price,
      weight: item.weight,
      imageUrl: item.imageUrl,
      badges: parseBadges(item.badges),
      isStopListed: item.isStopListed,
    })),
  }));
}

/** Меню для публичного просмотра: тот же источник, что и у гостя за столом. */
export async function getPublicMenuDto(restaurantId: string) {
  return toGuestMenuDto(await getGuestMenu(restaurantId));
}

/** Админские списки. */
export async function getManagerMenu(restaurantId: string) {
  const [items, categories] = await Promise.all([
    prisma.menuItem.findMany({
      where: { restaurantId },
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.category.findMany({
      where: { restaurantId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { menuItems: true } } },
    }),
  ]);
  return { items, categories };
}

export type ManagerMenuItem = Awaited<
  ReturnType<typeof getManagerMenu>
>["items"][number];
export type ManagerCategory = Awaited<
  ReturnType<typeof getManagerMenu>
>["categories"][number];
