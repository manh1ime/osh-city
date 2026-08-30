import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { categoriesSeed, menuItemsSeed } from "./menu-data";

const prisma = new PrismaClient();

async function main() {
  const slug = process.env.RESTAURANT_SLUG ?? "uchkuduk";
  const restaurant = await prisma.restaurant.findUnique({ where: { slug } });
  if (!restaurant) throw new Error(`Ресторан ${slug} не найден`);

  await prisma.$transaction(async (tx) => {
    await tx.category.updateMany({
      where: { restaurantId: restaurant.id },
      data: { isActive: false },
    });
    await tx.menuItem.updateMany({
      where: { restaurantId: restaurant.id },
      data: { isActive: false },
    });

    const categoryIds = new Map<string, string>();
    for (const category of categoriesSeed) {
      const matches = await tx.category.findMany({
        where: { restaurantId: restaurant.id, name: category.name },
        orderBy: { createdAt: "asc" },
      });
      const saved = matches[0]
        ? await tx.category.update({
            where: { id: matches[0].id },
            data: { ...category, isActive: true },
          })
        : await tx.category.create({
            data: { restaurantId: restaurant.id, ...category, isActive: true },
          });
      if (matches.length > 1) {
        await tx.category.updateMany({
          where: { id: { in: matches.slice(1).map((x) => x.id) } },
          data: { isActive: false },
        });
      }
      categoryIds.set(category.name, saved.id);
    }

    for (const item of menuItemsSeed) {
      const categoryId = categoryIds.get(item.category);
      if (!categoryId)
        throw new Error(`Не найдена категория: ${item.category}`);
      const matches = await tx.menuItem.findMany({
        where: { restaurantId: restaurant.id, name: item.name },
        orderBy: { createdAt: "asc" },
      });
      const data = {
        restaurantId: restaurant.id,
        categoryId,
        name: item.name,
        description: item.description,
        ingredients: item.ingredients,
        allergens: item.allergens,
        price: item.price,
        weight: item.weight,
        imageUrl: item.imageUrl,
        badges: item.badges,
        sortOrder: item.sortOrder,
        isStopListed: false,
        isActive: true,
      };
      if (matches[0])
        await tx.menuItem.update({ where: { id: matches[0].id }, data });
      else await tx.menuItem.create({ data });
      if (matches.length > 1) {
        await tx.menuItem.updateMany({
          where: { id: { in: matches.slice(1).map((x) => x.id) } },
          data: { isActive: false },
        });
      }
    }
  });

  console.log(
    `✅ Меню обновлено: ${categoriesSeed.length} категорий, ${menuItemsSeed.length} позиций.`,
  );
  console.log("Исторические заказы и предзаказы сохранены.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
