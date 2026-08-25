import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import {
  categoriesSeed,
  menuItemsSeed,
  restaurantSeed,
  staffSeed,
  tablesSeed,
} from "./seed-data";

const prisma = new PrismaClient();

function makeTableToken(tableNumber: number, length = 14): string {
  const raw = randomBytes(32)
    .toString("base64")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, length);
  return `tbl_${tableNumber}_${raw}`;
}

async function main() {
  const password = process.env.SEED_DEMO_PASSWORD ?? "demo123";
  const passwordHash = await bcrypt.hash(password, 10);

  console.log("→ Создаем ресторан", restaurantSeed.name);

  const restaurant = await prisma.restaurant.upsert({
    where: { slug: restaurantSeed.slug },
    update: {
      name: restaurantSeed.name,
      description: restaurantSeed.description,
      address: restaurantSeed.address,
      currency: restaurantSeed.currency,
      primaryColor: restaurantSeed.primaryColor,
      logoUrl: restaurantSeed.logoUrl,
      coverImageUrl: restaurantSeed.coverImageUrl,
      isOrderingEnabled: restaurantSeed.isOrderingEnabled,
    },
    create: {
      name: restaurantSeed.name,
      slug: restaurantSeed.slug,
      description: restaurantSeed.description,
      address: restaurantSeed.address,
      currency: restaurantSeed.currency,
      primaryColor: restaurantSeed.primaryColor,
      logoUrl: restaurantSeed.logoUrl,
      coverImageUrl: restaurantSeed.coverImageUrl,
      isOrderingEnabled: restaurantSeed.isOrderingEnabled,
    },
  });

  await prisma.securitySetting.upsert({
    where: { restaurantId: restaurant.id },
    update: {},
    create: { restaurantId: restaurant.id },
  });

  // Категории: старые категории скрываем, не удаляя связанные данные.
  await prisma.category.updateMany({
    where: { restaurantId: restaurant.id },
    data: { isActive: false },
  });
  const categoryByName = new Map<string, string>();
  for (const category of categoriesSeed) {
    const existing = await prisma.category.findFirst({
      where: { restaurantId: restaurant.id, name: category.name },
    });
    const saved = existing
      ? await prisma.category.update({
          where: { id: existing.id },
          data: {
            sortOrder: category.sortOrder,
            description: category.description,
            isActive: true,
          },
        })
      : await prisma.category.create({
          data: {
            restaurantId: restaurant.id,
            name: category.name,
            description: category.description,
            sortOrder: category.sortOrder,
          },
        });
    categoryByName.set(category.name, saved.id);
  }

  // Блюда: прежнее меню скрываем без удаления истории заказов.
  await prisma.menuItem.updateMany({
    where: { restaurantId: restaurant.id },
    data: { isActive: false },
  });
  for (const item of menuItemsSeed) {
    const categoryId = categoryByName.get(item.category);
    if (!categoryId) {
      throw new Error(
        `Не найдена категория ${item.category} для блюда ${item.name}`,
      );
    }
    const existing = await prisma.menuItem.findFirst({
      where: { restaurantId: restaurant.id, name: item.name },
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
      isStopListed: "isStopListed" in item ? Boolean(item.isStopListed) : false,
      isActive: true,
    };
    if (existing) {
      await prisma.menuItem.update({ where: { id: existing.id }, data });
    } else {
      await prisma.menuItem.create({ data });
    }
  }

  // Столы
  for (const table of tablesSeed) {
    const existing = await prisma.table.findFirst({
      where: { restaurantId: restaurant.id, number: table.number },
    });
    if (existing) {
      await prisma.table.update({
        where: { id: existing.id },
        data: { zone: table.zone, isActive: true },
      });
    } else {
      await prisma.table.create({
        data: {
          restaurantId: restaurant.id,
          number: table.number,
          zone: table.zone,
          token: makeTableToken(table.number),
        },
      });
    }
  }

  // Сотрудники
  for (const member of staffSeed) {
    await prisma.staffUser.upsert({
      where: { email: member.email },
      update: {
        name: member.name,
        role: member.role,
        isActive: true,
        passwordHash,
      },
      create: {
        restaurantId: restaurant.id,
        name: member.name,
        email: member.email,
        role: member.role,
        passwordHash,
      },
    });
  }

  const tables = await prisma.table.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { number: "asc" },
  });

  console.log("\n✅ Seed завершен.\n");
  console.log("Демо-доступы (пароль: " + password + "):");
  for (const member of staffSeed) {
    console.log(`  ${member.role.padEnd(8)} ${member.email}`);
  }
  console.log("\nQR-ссылки столов:");
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  for (const table of tables) {
    console.log(
      `  Стол ${table.number} (${table.zone ?? "-"}): ${base}/menu/${table.token}`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
