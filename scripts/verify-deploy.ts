import "dotenv/config";
import { prisma } from "../src/lib/db";

const requiredEnv = [
  "DATABASE_URL",
  "DIRECT_URL",
  "AUTH_SECRET",
  "HASH_SALT",
  "RESTAURANT_SLUG",
  "NEXT_PUBLIC_APP_URL",
] as const;

async function main() {
  const missing = requiredEnv.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
  if ((process.env.AUTH_SECRET?.length ?? 0) < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters for deployment");
  }
  if ((process.env.HASH_SALT?.length ?? 0) < 16) {
    throw new Error("HASH_SALT must be at least 16 characters for deployment");
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl || !appUrl.startsWith("https://")) {
    throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS for deployment");
  }

  await prisma.$queryRaw`SELECT 1`;
  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: process.env.RESTAURANT_SLUG },
    select: { id: true, name: true },
  });
  if (!restaurant) throw new Error("Configured restaurant was not found");

  const [branches, tables, categories, menuItems, zeroPricedItems] =
    await Promise.all([
      prisma.branch.count({ where: { restaurantId: restaurant.id, isActive: true } }),
      prisma.table.count({ where: { restaurantId: restaurant.id, isActive: true } }),
      prisma.category.count({ where: { restaurantId: restaurant.id, isActive: true } }),
      prisma.menuItem.count({ where: { restaurantId: restaurant.id, isActive: true } }),
      prisma.menuItem.findMany({
        where: { restaurantId: restaurant.id, isActive: true, price: { lte: 0 } },
        select: { name: true, price: true },
      }),
    ]);

  if (branches === 0 || tables === 0 || categories === 0 || menuItems === 0) {
    throw new Error(
      `Restaurant data is incomplete: branches=${branches}, tables=${tables}, categories=${categories}, menuItems=${menuItems}`,
    );
  }
  if (zeroPricedItems.length > 0) {
    throw new Error(
      `Active menu items have no price: ${zeroPricedItems.map((item) => item.name).join(", ")}`,
    );
  }

  console.log(
    JSON.stringify(
      { ok: true, restaurant: restaurant.name, branches, tables, categories, menuItems },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
