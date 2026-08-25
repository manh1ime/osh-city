import "server-only";
import { prisma } from "./db";

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
