import { prisma } from "./db";

/** Единый телефон кафе «Ош-Сити». Показываем гостям в подвале лендинга. */
export const RESTAURANT_PHONE = "+7(931)392-00-02";

/** Телефон в формате ссылки: годятся только «+» и цифры. */
export const RESTAURANT_PHONE_HREF = "tel:+79313920002";

/** Единственный адрес кафе. */
export const RESTAURANT_ADDRESS = "Ленинский проспект, 148";

/**
 * Филиал ровно один — кафе работает по адресу Ленинский проспект, 148.
 * Выбора филиала в приложении больше нет: гость бронирует стол в единственный
 * зал, а персонал работает в нём же.
 *
 * Модель филиалов в базе сохранена: на неё ссылаются столы, бронирования
 * и сотрудники. Любые другие записи (остатки старой конфигурации)
 * гасим при инициализации, чтобы старые адреса не всплыли в интерфейсе.
 */
export const DEFAULT_BRANCHES = [
  {
    slug: "leninsky",
    name: "Ленинский проспект, 148",
    address: RESTAURANT_ADDRESS,
    description: "Основной зал кафе. Работаем круглосуточно.",
    phone: RESTAURANT_PHONE,
    openTime: "00:00",
    closeTime: "23:59",
    tablesCount: 12,
    seatsPerTable: 4,
    sortOrder: 10,
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
 * Создаёт единственный филиал, если его ещё нет, и гасит все остальные.
 *
 * Важно: если база досталась от конфигурации с несколькими филиалами,
 * старые адреса не должны всплыть в приложении. Поэтому лишние филиалы
 * и их столы переводим в неактивные — удалять нельзя, на них ссылаются
 * старые заказы и бронирования.
 */
export async function ensureBranches(restaurantId: string) {
  const keepSlugs = DEFAULT_BRANCHES.map((branch) => branch.slug);

  for (const branch of DEFAULT_BRANCHES) {
    // slug филиала уникален глобально, поэтому в update переводим филиал на текущий
    // ресторан. Иначе, если в базе осталась старая запись ресторана, филиал
    // привязан к ней и бронирование падало бы с ошибкой.
    await prisma.branch.upsert({
      where: { slug: branch.slug },
      update: {
        restaurantId,
        name: branch.name,
        address: branch.address,
        description: branch.description,
        phone: branch.phone,
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
        phone: branch.phone,
        openTime: branch.openTime,
        closeTime: branch.closeTime,
        tablesCount: branch.tablesCount,
        seatsPerTable: branch.seatsPerTable,
        sortOrder: branch.sortOrder,
      },
    });
  }

  // Всё, что не наш единственный филиал, убираем из работы.
  const foreignBranches = await prisma.branch.findMany({
    where: { restaurantId, slug: { notIn: keepSlugs } },
    select: { id: true },
  });

  if (foreignBranches.length > 0) {
    const ids = foreignBranches.map((branch) => branch.id);
    await prisma.branch.updateMany({
      where: { id: { in: ids } },
      data: { isActive: false },
    });
    await prisma.table.updateMany({
      where: { branchId: { in: ids } },
      data: { isActive: false },
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

/**
 * Текущий (и единственный) филиал кафе.
 * Страницы больше не предлагают выбирать филиал, поэтому берём первый активный.
 */
export async function getPrimaryBranch(
  restaurantId: string,
): Promise<BranchDto | null> {
  const branches = await getActiveBranches(restaurantId);
  return branches[0] ?? null;
}

/**
 * Идентификатор единственного филиала.
 * Нужен там, где модель требует branchId: столы, бронирования, сотрудники.
 */
export async function getPrimaryBranchId(restaurantId: string): Promise<string> {
  const branches = await getActiveBranches(restaurantId);
  const branch = branches[0];
  if (!branch) {
    throw new Error("Филиал не найден. Запустите `npm run db:seed`.");
  }
  return branch.id;
}
