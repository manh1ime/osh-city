import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.restaurant.updateMany({
    where: { OR: [{ slug: "uchkuduk" }, { name: { equals: "Учкудук", mode: "insensitive" } }] },
    data: {
      name: "Учкудук",
      slug: "uchkuduk",
      primaryColor: "#D7AA50",
      coverImageUrl: "/images/eastern-night-hero.webp",
    },
  });
  if (!result.count) throw new Error("Ресторан Учкудук не найден");
  console.log(`✅ Оформление ресторана обновлено. Записей: ${result.count}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
