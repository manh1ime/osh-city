/**
 * ДАННЫЕ РЕСТОРАНА «УЧКУДУК».
 * Первый клиент проекта: все данные и идентификаторы относятся к ресторану «Учкудук».
 */

export const restaurantSeed = {
  name: "Учкудук",
  slug: "uchkuduk",
  description: "Восточная кухня, приготовленная с теплом и щедростью",
  address: "Санкт-Петербург",
  currency: "₽",
  primaryColor: "#D7AA50",
  logoUrl: null as string | null,
  coverImageUrl: "/images/eastern-night-hero.webp",
  isOrderingEnabled: true,
};

/**
 * Филиалы кафе. Держать в синхроне с DEFAULT_BRANCHES в src/lib/branches.ts:
 * там такой же список на случай пустой базы без сида.
 */
export const branchesSeed = [
  {
    slug: "vasilievsky",
    name: "На Васильевском острове",
     address: "Васильевский остров 9-я линия 16",
    description: "Просторный зал рядом с набережной. Работает весь день.",
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
];

export const categoriesSeed = [
  { name: "Горячие блюда", sortOrder: 10, description: "Сытные блюда восточной и домашней кухни" },
  { name: "Супы", sortOrder: 20, description: "Наваристые супы и ароматные бульоны" },
  { name: "Шашлык", sortOrder: 30, description: "Приготовлено на огне и подаётся горячим" },
  { name: "Гарниры", sortOrder: 40, description: "Хрустящий картофель к основному блюду" },
  { name: "Салаты", sortOrder: 50, description: "Свежие салаты и яркие сочетания" },
];

export const menuItemsSeed = [
  {
    name: "Бешбармак", category: "Горячие блюда", price: 470, weight: "300 г",
    description: "Традиционное блюдо с нежным мясом, домашним тестом и томлёным луком.",
    ingredients: "Мясо, домашнее тесто, репчатый лук, бульон, специи", allergens: "Глютен, яйцо", badges: "Национальное блюдо",
    imageUrl: "/images/menu/beshbarmak.webp", sortOrder: 10,
  },
  {
    name: "Домашние пельмени", category: "Горячие блюда", price: 400, weight: "300 г",
    description: "Пельмени ручной лепки с сочной мясной начинкой, подаются со сметаной.",
    ingredients: "Тесто, мясной фарш, лук, специи, сметана", allergens: "Глютен, яйцо, молоко", badges: "Домашнее",
    imageUrl: "/images/menu/pelmeni.webp", sortOrder: 20,
  },
  {
    name: "Жареные манты", category: "Горячие блюда", price: 475, weight: "350 г",
    description: "Сочные манты с мясом и луком, обжаренные до золотистой корочки.",
    ingredients: "Тесто, мясо, лук, специи, растительное масло", allergens: "Глютен, яйцо", badges: "Хрустящие",
    imageUrl: "/images/menu/fried-manti.webp", sortOrder: 30,
  },
  {
    name: "Жаркое из курицы", category: "Горячие блюда", price: 490, weight: "300 г",
    description: "Курица, томлённая с картофелем, овощами и ароматными специями.",
    ingredients: "Курица, картофель, лук, морковь, сладкий перец, специи", allergens: null, badges: null,
    imageUrl: "/images/menu/chicken-roast.webp", sortOrder: 40,
  },
  {
    name: "Куурдак", category: "Горячие блюда", price: 600, weight: "300 г",
    description: "Обжаренное мясо с картофелем и луком по традиционному рецепту.",
    ingredients: "Мясо, картофель, репчатый лук, чеснок, специи", allergens: null, badges: "Сытное",
    imageUrl: "/images/menu/kuurdak.webp", sortOrder: 50,
  },
  {
    name: "Лагман жареный", category: "Горячие блюда", price: 400, weight: "400 г",
    description: "Домашняя лапша, обжаренная с мясом, овощами и восточными специями.",
    ingredients: "Лапша, мясо, сладкий перец, лук, томаты, специи", allergens: "Глютен, яйцо", badges: null,
    imageUrl: "/images/menu/fried-lagman.webp", sortOrder: 60,
  },
  {
    name: "Лагман уйгурский", category: "Горячие блюда", price: 400, weight: "400 г",
    description: "Тянутая лапша с мясом и овощами в насыщенном ароматном соусе.",
    ingredients: "Домашняя лапша, мясо, овощи, томаты, зелень, специи", allergens: "Глютен, яйцо", badges: "По-уйгурски",
    imageUrl: "/images/menu/uyghur-lagman.webp", sortOrder: 70,
  },
  {
    name: "Манты", category: "Горячие блюда", price: 475, weight: "350 г",
    description: "Большие манты на пару с сочной мясной начинкой и луком.",
    ingredients: "Тесто, мясо, репчатый лук, специи", allergens: "Глютен, яйцо", badges: "На пару",
    imageUrl: "/images/menu/manti.webp", sortOrder: 80,
  },
  {
    name: "Плов", category: "Горячие блюда", price: 400, weight: "350 г",
    description: "Рассыпчатый рис с мясом, морковью, луком и восточными специями.",
    ingredients: "Рис, мясо, морковь, лук, чеснок, зира, специи", allergens: null, badges: "Хит",
    imageUrl: "/images/menu/plov.webp", sortOrder: 90,
  },
  {
    name: "Чебурек", category: "Горячие блюда", price: 200, weight: "100 г",
    description: "Тонкое хрустящее тесто с сочной мясной начинкой.",
    ingredients: "Тесто, мясной фарш, лук, специи", allergens: "Глютен", badges: null,
    imageUrl: "/images/menu/cheburek.webp", sortOrder: 100,
  },
  {
    name: "Борщ", category: "Супы", price: 350, weight: "400 г",
    description: "Наваристый борщ со свёклой, капустой и мясом, подаётся со сметаной.",
    ingredients: "Мясной бульон, свёкла, капуста, картофель, морковь, сметана", allergens: "Молоко", badges: null,
    imageUrl: "/images/menu/borscht.webp", sortOrder: 110,
  },
  {
    name: "Куриный бульон", category: "Супы", price: 320, weight: "400 г",
    description: "Лёгкий прозрачный бульон с курицей, домашней лапшой и зеленью.",
    ingredients: "Куриный бульон, курица, лапша, морковь, зелень", allergens: "Глютен, яйцо", badges: "Лёгкий",
    imageUrl: "/images/menu/chicken-broth.webp", sortOrder: 120,
  },
  {
    name: "Суп по-казахски", category: "Супы", price: 350, weight: "400 г",
    description: "Сытный мясной суп с домашней лапшой и ароматным бульоном.",
    ingredients: "Мясо, бульон, домашняя лапша, лук, зелень, специи", allergens: "Глютен, яйцо", badges: "Национальное блюдо",
    imageUrl: "/images/menu/kazakh-soup.webp", sortOrder: 130,
  },
  {
    name: "Чучвара", category: "Супы", price: 350, weight: "400 г",
    description: "Маленькие пельмени ручной лепки в пряном бульоне с зеленью.",
    ingredients: "Бульон, тесто, мясной фарш, лук, зелень, специи", allergens: "Глютен, яйцо", badges: null,
    imageUrl: "/images/menu/chuchvara.webp", sortOrder: 140,
  },
  {
    name: "Шорпо", category: "Супы", price: 400, weight: "400 г",
    description: "Наваристый суп с мясом, картофелем и крупно нарезанными овощами.",
    ingredients: "Мясо, картофель, морковь, лук, сладкий перец, зелень", allergens: null, badges: "Наваристое",
    imageUrl: "/images/menu/shorpo.webp", sortOrder: 150,
  },
  {
    name: "Люля-кебаб", category: "Шашлык", price: 390, weight: "200 г",
    description: "Сочный рубленый кебаб с луком и специями, приготовленный на углях.",
    ingredients: "Мясной фарш, лук, зелень, специи", allergens: null, badges: "На углях",
    imageUrl: "/images/menu/lula-kebab.webp", sortOrder: 160,
  },
  {
    name: "Шашлык из баранины", category: "Шашлык", price: 550, weight: "250 г",
    description: "Отборная баранина, маринованная со специями и обжаренная на углях.",
    ingredients: "Баранина, лук, специи, зелень", allergens: null, badges: "На углях",
    imageUrl: "/images/menu/lamb-shashlik.webp", sortOrder: 170,
  },
  {
    name: "Шашлык из куриных крылышек", category: "Шашлык", price: 390, weight: "200 г",
    description: "Румяные куриные крылышки в пряном маринаде, приготовленные на огне.",
    ingredients: "Куриные крылышки, специи, растительное масло", allergens: null, badges: null,
    imageUrl: "/images/menu/chicken-wings-shashlik.webp", sortOrder: 180,
  },
  {
    name: "Шашлык из курицы", category: "Шашлык", price: 455, weight: "250 г",
    description: "Нежное куриное филе в ароматном маринаде, приготовленное на углях.",
    ingredients: "Куриное филе, лук, специи, растительное масло", allergens: null, badges: "Нежный",
    imageUrl: "/images/menu/chicken-shashlik.webp", sortOrder: 190,
  },
  {
    name: "Картофель Айдахо", category: "Гарниры", price: 200, weight: "150 г",
    description: "Запечённые картофельные дольки с чесноком и душистыми травами.",
    ingredients: "Картофель, чеснок, растительное масло, травы, специи", allergens: null, badges: null,
    imageUrl: "/images/menu/idaho-potatoes.webp", sortOrder: 200,
  },
  {
    name: "Картофель фри", category: "Гарниры", price: 200, weight: "150 г",
    description: "Золотистый хрустящий картофель, обжаренный до румяной корочки.",
    ingredients: "Картофель, растительное масло, соль", allergens: null, badges: null,
    imageUrl: "/images/menu/french-fries.webp", sortOrder: 210,
  },
  {
    name: "Салат острый", category: "Салаты", price: 500, weight: "200 г",
    description: "Свежие овощи, зелень и острый перец в пикантной восточной заправке.",
    ingredients: "Томаты, огурцы, сладкий и острый перец, лук, зелень, заправка", allergens: null, badges: "Острое",
    imageUrl: "/images/menu/spicy-salad.webp", sortOrder: 220,
  },
  {
    name: "Салат Цезарь", category: "Салаты", price: 455, weight: "200 г",
    description: "Куриное филе, салат романо, пармезан, хрустящие гренки и соус цезарь.",
    ingredients: "Куриное филе, романо, пармезан, гренки, соус цезарь", allergens: "Глютен, молоко, яйцо, рыба", badges: "Хит",
    imageUrl: "/images/menu/caesar-salad.webp", sortOrder: 230,
  },
];

/**
 * Столы создаются отдельно для каждого филиала: по 12 штук, нумерация 1..12.
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
 * Персонал кафе «Учкудук».
 * Садовая: Худойберди. Васильевский: Гулнара и Акрам.
 */
export const staffSeed = [
  {
    name: "Худойберди",
    email: "hudoyberdi@uchkuduk.ru",
    // Старший официант на Садовой: принимает брони своего филиала.
    role: "SENIOR_WAITER" as const,
    branchSlug: "sadovaya" as string | null,
  },
  {
    name: "Гулнара",
    email: "gulnara@uchkuduk.ru",
    // Старший официант на Васильевском.
    role: "SENIOR_WAITER" as const,
    branchSlug: "vasilievsky" as string | null,
  },
  {
    name: "Акрам",
    email: "akram@uchkuduk.ru",
    role: "WAITER" as const,
    branchSlug: "vasilievsky" as string | null,
  },
  {
    name: "Менеджер",
    email: "manager@demo.ru",
    role: "MANAGER" as const,
    branchSlug: null as string | null,
  },
];

/**
 * Сотрудники старого «Учкудука». Сид отключает их доступ,
 * но не удаляет записи: на них ссылаются старые заказы и аудит.
 */
export const legacyStaffEmails = ["waiter@demo.ru"];
