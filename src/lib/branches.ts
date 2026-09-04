import { prisma } from "./db";

/**
 * Филиалы кафе. Пока их два, но модель уже полноценная:
 * персонал, бронирования и отчёты будут привязываться к branchId.
 */
export const DEFAULT_BRANCHES = [
  {
    slug: "vasilievsky",
    name: "На Васильевском острове",
     address: "Васильевский остров 9-я линия 16",
    description: "Просторный зал рядом с набережной. Открыто круглосуточно.",
    openTime: "00:00",
    closeTime: "23:59",
    tablesCount: 12,
    seatsPerTable: 4,
    sortOrder: 10,
  },
  {
    slug: "sadovaya",
    name: "На Садовой",
    address: "Садовая улица, 44",
     description: "Уютный зал в центре города, в двух шагах от Сенной. Работаем ежедневно до 2 часов ночи.",
     openTime: "00:00",
     closeTime: "02:00",
    tablesCount: 12,
    seatsPerTable: 4,
    sortOrder: 20,
  },
] as const;

export type BranchDto = {
  id: string;
  slug: string;
  name: string;
  address: string;
  description: string | null;
  phone: string | null;
  openTime: string;
  closeTime: string;
  tablesCount: number;
  seatsPerTable: number;
};

/**
 * Создаёт филиалы по умолчанию, если их ещё нет.
 * Логика та же, что у getSecuritySettings: страница не должна падать на пустой базе.
 */
export async function ensureBranches(restaurantId: string) {
  const existing = await prisma.branch.count({ where: { restaurantId } });
  if (existing > 0) return;

  for (const branch of DEFAULT_BRANCHES) {
    // slug филиала уникален глобально, поэтому в update переводим филиал на текущий
    // ресторан. Иначе, если в базе осталась старая запись ресторана, филиалы
    // привязаны к ней и список на лендинге оказывается пустым.
    await prisma.branch.upsert({
      where: { slug: branch.slug },
      update: {
        restaurantId,
        name: branch.name,
        address: branch.address,
        openTime: branch.openTime,
        closeTime: branch.closeTime,
        tablesCount: branch.tablesCount,
        seatsPerTable: branch.seatsPerTable,
        sortOrder: branch.sortOrder,
        isActive: true,
      },
      create: {
        restaurantId,
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
  }
}

export async function getActiveBranches(
  restaurantId: string,
): Promise<BranchDto[]> {
  await ensureBranches(restaurantId);
  const branches = await prisma.branch.findMany({
    where: { restaurantId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return branches.map((branch) => ({
    id: branch.id,
    slug: branch.slug,
    name: branch.name,
    address: branch.address,
    description: branch.description,
    phone: branch.phone,
    openTime: branch.openTime,
    closeTime: branch.closeTime,
    tablesCount: branch.tablesCount,
    seatsPerTable: branch.seatsPerTable,
  }));
}
