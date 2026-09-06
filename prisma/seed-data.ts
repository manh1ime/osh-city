/**
 * ДАННЫЕ РЕСТОРАНА «ОШ-СИТИ».
 * Первый клиент проекта: все данные и идентификаторы относятся к ресторану «Ош-Сити».
 */

export const restaurantSeed = {
  name: "Ош-Сити",
  slug: "osh-city",
  description: "Восточная кухня, приготовленная с теплом и щедростью",
  address: "Ленинский проспект, 148",
  currency: "₽",
  primaryColor: "#D7AA50",
  logoUrl: null as string | null,
  coverImageUrl: "/images/eastern-night-hero.webp",
  isOrderingEnabled: true,
};

/**
 * Филиал кафе ровно один: Ленинский проспект, 148.
 * Держать в синхроне с DEFAULT_BRANCHES в src/lib/branches.ts:
 * там такой же список на случай пустой базы без сида.
 */
export const branchesSeed = [
  {
    slug: "leninsky",
    name: "Ленинский проспект, 148",
    address: "Ленинский проспект, 148",
    description: "Основной зал кафе. Работаем круглосуточно.",
    openTime: "00:00",
    closeTime: "23:59",
    tablesCount: 12,
    seatsPerTable: 4,
    sortOrder: 10,
  },
];

/**
 * Столы единственного зала: 12 штук, нумерация 1..12.
 * Зона помогает официантам ориентироваться в зале.
 */
export function buildTablesSeed(): Array<{
  branchSlug: string;
  number: number;
  zone: string;
  seats: number;
}> {
  const tables: Array<{
    branchSlug: string;
    number: number;
    zone: string;
    seats: number;
  }> = [];

  for (const branch of branchesSeed) {
    for (let number = 1; number <= branch.tablesCount; number += 1) {
      tables.push({
        branchSlug: branch.slug,
        number,
        zone: number <= 8 ? "Основной зал" : "Восточный зал",
        seats: branch.seatsPerTable,
      });
    }
  }

  return tables;
}

export const tablesSeed = buildTablesSeed();

/**
 * Персонал кафе «Ош-Сити». Все работают в единственном зале.
 */
export const staffSeed = [
  {
    name: "Худойберди",
    email: "hudoyberdi@osh-city.ru",
    // Старший официант: принимает брони кафе.
    role: "SENIOR_WAITER" as const,
    branchSlug: "leninsky" as string | null,
  },
  {
    name: "Гулнара",
    email: "gulnara@osh-city.ru",
    role: "SENIOR_WAITER" as const,
    branchSlug: "leninsky" as string | null,
  },
  {
    name: "Акрам",
    email: "akram@osh-city.ru",
    role: "WAITER" as const,
    branchSlug: "leninsky" as string | null,
  },
  {
    name: "Менеджер",
    email: "manager@demo.ru",
    role: "MANAGER" as const,
    branchSlug: null as string | null,
  },
];

/**
 * Устаревшие демо-аккаунты. Сид отключает их доступ,
 * но не удаляет записи: на них ссылаются старые заказы и аудит.
 */
export const legacyStaffEmails = ["waiter@demo.ru"];
