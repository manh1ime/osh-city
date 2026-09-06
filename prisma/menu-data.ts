// Меню кафе «Ош-Сити» (Ленинский проспект, 148).
// Источник позиций — папка «Меню Ош-Сити»: названия папок = категории,
// названия файлов = названия блюд.
// Цены, переданные для текущего меню ресторана.

export const categoriesSeed = [
  { name: "Завтраки", sortOrder: 10, description: "Сытные завтраки: каши, блины, яичница" },
  { name: "Первые блюда", sortOrder: 20, description: "Горячие супы и наваристые бульоны" },
  { name: "Вторые блюда", sortOrder: 30, description: "Плов, лагман, манты и другие горячие блюда" },
  { name: "Мангал", sortOrder: 40, description: "Шашлык, люля и крылышки на углях" },
  { name: "Салаты", sortOrder: 50, description: "Свежие салаты и домашние соленья" },
  { name: "Выпечка", sortOrder: 60, description: "Свежая выпечка из тандыра" },
  { name: "Десерты", sortOrder: 70, description: "Сладкое к чаю" },
  { name: "Горячие напитки", sortOrder: 80, description: "Чай на любой вкус" },
  { name: "Холодные напитки", sortOrder: 90, description: "Прохладительные напитки, соки и лимонады" },
] as const;

type MenuSeedItem = {
  name: string;
  category: string;
  price: number;
  weight: string | null;
  imageUrl: string | null;
  sortOrder: number;
  description: string;
  ingredients: string | null;
  allergens: string | null;
  badges: string | null;
};

let order = 0;
const pricesByName: Record<string, number> = {
  // Завтраки
  "Каша манная": 250,
  "Каша рисовая": 250,
  "Каша овсяная": 200,
  "Блины со сметаной": 50,
  "Блины с творогом": 60,
  "Яичница с колбасой": 250,
  // Первые блюда
  "Айрим сай": 500,
  "Лагман по уйгурски": 490,
  "Лагман национальный": 390,
  Мастава: 380,
  "Мясо по казахски": 400,
  "Пельмени с бульоном": 380,
  Чучвара: 380,
  "Шурпа с говядиной": 430,
  // Вторые блюда
  Бифштекс: 450,
  Манты: 430,
  Плов: 450,
  "Манты жареный": 450,
  "Пельмени жареные": 380,
  "Казан кебаб": 650,
  Куурдак: 630,
  "Аччуу эт": 620,
  "Лагман жареный": 490,
  Жаровня: 490,
  "Мясо по Тайски": 500,
  "Мясо по Французски": 500,
  Бризоль: 500,
  "Курица с овощами": 490,
  Бешбармак: 480,
  Оромо: 420,
  // Мангал
  "Шашлык из говядины": 410,
  "Шашлык из баранины": 470,
  "Шашлык из курицы": 350,
  "Люля из говядины": 320,
  Крылышки: 350,
  // Салаты
  "Мужской каприз": 350,
  "Цезарь с курицей": 350,
  Острый: 350,
  "Ачык чучук": 300,
  Греческий: 350,
  Оливье: 340,
  Витаминка: 250,
  "Свежий овощной": 300,
  Соленья: 300,
  "Тещин язык": 380,
  // Выпечка и десерты
  Лепешка: 60,
  "Десерты на выбор": 280,
  // Горячие напитки
  "Чай черный": 100,
  "Чай зеленый": 100,
  "Чай с чебрецом": 150,
  "Чай с мятой": 150,
  "Чай фруктовый": 170,
  // Холодные напитки
  "Султан чай со вкусом персика": 180,
  "Султан чай с лимоном": 180,
  "Сок Добрый (яблоко) 1 л": 200,
  "Сок Добрый (вишня) 1 л": 200,
  "Сок Добрый (ананас) 1 л": 200,
  "Сок Добрый (апельсин) 1 л": 200,
  "Сок Добрый (виноград) 1 л": 200,
  "Пепси 1 л": 200,
  "Пепси 0,5 л": 150,
  "Пепси 0,33 л": 150,
  "Мохито клубника 0,45 л": 150,
  "Фанта 1 л": 200,
  "Роял гранатовый 0,3 л": 130,
  "Кола 1 л": 200,
};

const dish = (
  name: string,
  category: string,
  weight: string | null,
  image: string | null,
  description = "",
): MenuSeedItem => ({
  name,
  category,
  price: pricesByName[name] ?? 0,
  weight,
  imageUrl: image ? `/menu/${image}` : null,
  sortOrder: (order += 10),
  description,
  ingredients: null,
  allergens: null,
  badges: null,
});

export const menuItemsSeed: MenuSeedItem[] = [
  // Завтраки
  dish("Блины с творогом", "Завтраки", null, "bliny-s-tvorogom.jpg"),
  dish("Блины со сметаной", "Завтраки", null, "bliny-so-smetanoy.jpg"),
  dish("Каша манная", "Завтраки", null, "kasha-mannaya.jpg"),
  dish("Каша овсяная", "Завтраки", null, "kasha-ovsyanaya.webp"),
  dish("Каша рисовая", "Завтраки", null, "kasha-risovaya.jpg"),
  dish("Яичница с колбасой", "Завтраки", null, "yaichnica-s-kolbasoy.jpg"),

  // Первые блюда
  dish("Айрим сай", "Первые блюда", null, "ayrim-say.webp"),
  dish("Лагман национальный", "Первые блюда", null, "lagman-nacionalnyy.jpg"),
  dish("Лагман по уйгурски", "Первые блюда", null, "lagman-po-uygurski.webp"),
  dish("Мастава", "Первые блюда", null, "mastava.webp"),
  dish("Мясо по казахски", "Первые блюда", null, "myaso-po-kazahski.webp"),
  dish("Пельмени с бульоном", "Первые блюда", null, "pelmeni-s-bulonom.webp"),
  dish("Чучвара", "Первые блюда", null, "chuchvara.jpg"),
  dish("Шурпа с говядиной", "Первые блюда", null, "shurpa-s-govyadinoy.jpg"),

  // Вторые блюда
  dish("Аччуу эт", "Вторые блюда", null, "achchuu-et.jpg"),
  dish("Бешбармак", "Вторые блюда", null, "beshbarmak.jpg"),
  dish("Бифштекс", "Вторые блюда", null, "bifshteks.webp"),
  dish("Бризоль", "Вторые блюда", null, "brizol.jpg"),
  dish("Жаровня", "Вторые блюда", null, "zharovnya.jpg"),
  dish("Казан кебаб", "Вторые блюда", null, "kazan-kebab.jpg"),
  dish("Курица с овощами", "Вторые блюда", null, "kurica-s-ovoschami.webp"),
  dish("Куурдак", "Вторые блюда", null, "kuurdak.jpg"),
  dish("Лагман жареный", "Вторые блюда", null, "lagman-zharenyy.avif"),
  dish("Манты жареный", "Вторые блюда", null, "manty-zharenyy.webp"),
  dish("Манты", "Вторые блюда", null, "manty.webp"),
  dish("Мясо по Тайски", "Вторые блюда", null, "myaso-po-tayski.avif"),
  dish("Мясо по Французски", "Вторые блюда", null, "myaso-po-francuzski.jpg"),
  dish("Оромо", "Вторые блюда", null, "oromo.jpg"),
  dish("Пельмени жареные", "Вторые блюда", null, "pelmeni-zharenye.webp"),
  dish("Плов", "Вторые блюда", null, "plov.jpg"),

  // Мангал
  dish("Крылышки", "Мангал", null, "krylyshki.jpg"),
  dish("Люля из говядины", "Мангал", null, "lyulya-iz-govyadiny.webp"),
  dish("Шашлык из баранины", "Мангал", null, "shashlyk-iz-baraniny.jpg"),
  dish("Шашлык из говядины", "Мангал", null, "shashlyk-iz-govyadiny.jpg"),
  dish("Шашлык из курицы", "Мангал", null, "shashlyk-iz-kuricy.webp"),

  // Салаты
  dish("Ачык чучук", "Салаты", null, "achyk-chuchuk.jpg"),
  dish("Витаминка", "Салаты", null, "vitaminka.jpg"),
  dish("Греческий", "Салаты", null, "grecheskiy.webp"),
  dish("Мужской каприз", "Салаты", null, "muzhskoy-kapriz.jpg"),
  dish("Оливье", "Салаты", null, "olive.jpg"),
  dish("Острый", "Салаты", null, "ostryy.jpg"),
  dish("Свежий овощной", "Салаты", null, "svezhiy-ovoschnoy.webp"),
  dish("Соленья", "Салаты", null, "solenya.jpg"),
  dish("Тещин язык", "Салаты", null, "teschin-yazyk.jpg"),
  dish("Цезарь с курицей", "Салаты", null, "cezar-s-kuricey.jpg"),

  // Выпечка
  dish("Лепешка", "Выпечка", null, "lepeshka.webp"),

  // Десерты
  dish("Десерты на выбор", "Десерты", null, "deserty-na-vybor.jpg"),

  // Горячие напитки
  dish("Чай зеленый", "Горячие напитки", null, "chay-zelenyy.jpg"),
  dish("Чай с мятой", "Горячие напитки", null, "chay-s-myatoy.jpg"),
  dish("Чай с чебрецом", "Горячие напитки", null, "chay-s-chebrecom.webp"),
  dish("Чай фруктовый", "Горячие напитки", null, "chay-fruktovyy.jpg"),
  dish("Чай черный", "Горячие напитки", null, "chay-chernyy.jpg"),

  // Холодные напитки
  dish("Кола 1 л", "Холодные напитки", "1 л", "kola-1l.jpg"),
  dish("Мохито клубника 0,45 л", "Холодные напитки", "0,45 л", "mohito-klubnika-0-45.webp"),
  dish("Мохито лайм 0,45 л", "Холодные напитки", "0,45 л", "mohito-laym-0-45.webp"),
  dish("Пепси 0,33 л", "Холодные напитки", "0,33 л", "pepsi-0-33.webp"),
  dish("Пепси 0,5 л", "Холодные напитки", "0,5 л", "pepsi-0-5.png"),
  dish("Пепси 1 л", "Холодные напитки", "1 л", "pepsi-1-l.jpg"),
  dish("Роял гранатовый 0,3 л", "Холодные напитки", "0,3 л", "royal-granatovyy-0-3.jpg"),
  dish("Сок Добрый (апельсин) 1 л", "Холодные напитки", "1 л", "sok-dobryy-apelsin-1-l.jpg"),
  dish("Сок Добрый (виноград) 1 л", "Холодные напитки", "1 л", "sok-dobryy-vinograd-1-l.webp"),
  dish("Сок Добрый (вишня) 1 л", "Холодные напитки", "1 л", "sok-dobryy-vishnya-1-l.jpg"),
  dish("Сок Добрый (яблоко) 1 л", "Холодные напитки", "1 л", "sok-dobryy-yabloko-1-l.jpg"),
  dish("Сок Добрый (ананас) 1 л", "Холодные напитки", "1 л", null),
  dish("Султан чай с лимоном", "Холодные напитки", null, "sultan-chay-s-limonom.png"),
  dish("Султан чай со вкусом персика", "Холодные напитки", null, "sultan-chay-so-vkusom-persika.png"),
  dish("Фанта 1 л", "Холодные напитки", "1 л", "fanta-1-l.png"),
];
