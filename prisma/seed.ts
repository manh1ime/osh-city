import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import {
  branchesSeed,
  legacyStaffEmails,
  restaurantSeed,
  staffSeed,
  tablesSeed,
} from "./seed-data";
import { categoriesSeed, menuItemsSeed } from "./menu-data";

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

  // Филиалы: Васильевский остров и Садовая улица.
  const branchIdBySlug = new Map<string, string>();
  for (const branch of branchesSeed) {
    const saved = await prisma.branch.upsert({
      where: { slug: branch.slug },
      update: {
        restaurantId: restaurant.id,
        name: branch.name,
        address: branch.address,
        description: branch.description,
        openTime: branch.openTime,
        closeTime: branch.closeTime,
        tablesCount: branch.tablesCount,
        seatsPerTable: branch.seatsPerTable,
        sortOrder: branch.sortOrder,
        isActive: true,
      },
      create: {
        restaurantId: restaurant.id,
        slug: branch.slug,
        name: branch.name,
        address: branch.address,
        description: branch.description,
        openTime: branch.openTime,
        closeTime: branch.closeTime,
        tablesCount: branch.tablesCount,
        seatsPerTable: branch.seatsPerTable,
        sortOrder: branch.sortOrder,
      },
    });
    branchIdBySlug.set(branch.slug, saved.id);
  }
  console.log(`→ Филиалов: ${branchIdBySlug.size}`);

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

  // Столы старого единого зала (без филиала) убираем из работы:
  // удалять нельзя, на них ссылаются старые заказы.
  await prisma.table.updateMany({
    where: { restaurantId: restaurant.id, branchId: null },
    data: { isActive: false },
  });

  // Столы: по 12 в каждом филиале, по 4 места.
  for (const table of tablesSeed) {
    const branchId = branchIdBySlug.get(table.branchSlug);
    if (!branchId) {
      throw new Error(`Не найден филиал ${table.branchSlug} для стола ${table.number}`);
    }
    const existing = await prisma.table.findFirst({
      where: { restaurantId: restaurant.id, branchId, number: table.number },
    });
    if (existing) {
      await prisma.table.update({
        where: { id: existing.id },
        data: { zone: table.zone, seats: table.seats, isActive: true },
      });
    } else {
      await prisma.table.create({
        data: {
          restaurantId: restaurant.id,
          branchId,
          number: table.number,
          zone: table.zone,
          seats: table.seats,
          token: makeTableToken(table.number),
        },
      });
    }
  }

  // Сотрудники «Учкудука» теряют доступ, но остаются в истории заказов.
  if (legacyStaffEmails.length > 0) {
    const removed = await prisma.staffUser.updateMany({
      where: {
        restaurantId: restaurant.id,
        email: { in: legacyStaffEmails },
      },
      data: { isActive: false, branchId: null },
    });
    if (removed.count > 0) {
      console.log(`→ Отключено старых сотрудников: ${removed.count}`);
    }
  }

  // Новый персонал «Учкудука» с привязкой к филиалу.
  for (const member of staffSeed) {
    const branchId = member.branchSlug
      ? (branchIdBySlug.get(member.branchSlug) ?? null)
      : null;
    if (member.branchSlug && !branchId) {
      throw new Error(
        `Не найден филиал ${member.branchSlug} для сотрудника ${member.name}`,
      );
    }
    await prisma.staffUser.upsert({
      where: { email: member.email },
      update: {
        name: member.name,
        role: member.role,
        branchId,
        isActive: true,
        passwordHash,
      },
      create: {
        restaurantId: restaurant.id,
        name: member.name,
        email: member.email,
        role: member.role,
        branchId,
        passwordHash,
      },
    });
  }

  const tables = await prisma.table.findMany({
    where: { restaurantId: restaurant.id, isActive: true },
    orderBy: [{ branchId: "asc" }, { number: "asc" }],
    include: { branch: true },
  });

  console.log("\n✅ Seed завершен.\n");
  console.log("Доступы сотрудников (пароль: " + password + "):");
  for (const member of staffSeed) {
    const where = member.branchSlug ?? "оба филиала";
    console.log(
      `  ${member.role.padEnd(8)} ${member.name.padEnd(12)} ${member.email.padEnd(24)} ${where}`,
    );
  }
  console.log("\nQR-ссылки столов:");
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://uchkuduk.ru";
  for (const table of tables) {
    const branchName = table.branch?.name ?? "без филиала";
    console.log(
      `  ${branchName}, стол ${table.number} (${table.zone ?? "-"}): ${base}/menu/${table.token}`,
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
