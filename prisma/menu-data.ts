export const categoriesSeed = [
  { name: "Салаты", sortOrder: 10, description: "Свежие и любимые салаты" },
  {
    name: "Горячие блюда",
    sortOrder: 20,
    description: "Горячие блюда восточной и домашней кухни",
  },
  { name: "Завтрак", sortOrder: 30, description: "Сытный завтрак" },
  { name: "Супы", sortOrder: 40, description: "Наваристые супы" },
  { name: "Шашлык", sortOrder: 50, description: "Блюда на мангале" },
  { name: "Закуски", sortOrder: 60, description: "Холодные закуски и ассорти" },
  { name: "Соусы", sortOrder: 70, description: "Соусы к вашим блюдам" },
  { name: "Гарниры", sortOrder: 80, description: "Гарниры к основным блюдам" },
  { name: "Напитки", sortOrder: 90, description: "Прохладительные напитки" },
] as const;

type MenuSeedItem = {
  name: string;
  category: string;
  price: number;
  weight: string;
  imageUrl: string | null;
  sortOrder: number;
  description: string;
  ingredients: string | null;
  allergens: string | null;
  badges: string | null;
};

let order = 0;
const dish = (
  name: string,
  category: string,
  weight: string,
  price: number,
  image: string | null,
  description?: string,
): MenuSeedItem => ({
  name,
  category,
  weight,
  price,
  imageUrl: image ? `/menu/${image}` : null,
  sortOrder: (order += 10),
  description: description ?? `${name} — ${weight}.`,
  ingredients: null,
  allergens: null,
  badges: null,
});

export const menuItemsSeed: MenuSeedItem[] = [
  dish("Винегрет", "Салаты", "200 г", 360, "vinegret.jpg"),
  dish("Доллар", "Салаты", "230 г", 400, "dollar.jpg"),
  dish("Салат веча", "Салаты", "250 г", 400, "vecha.jpg"),
  dish("Салат витаминный", "Салаты", "150 г", 350, "vitaminnyy.jpg"),
  dish("Салат греческий", "Салаты", "250 г", 400, "greek-salad.jpg"),
  dish("Салат оливье", "Салаты", "250 г", 400, "olivier.jpg"),
  dish("Салат пикантный", "Салаты", "200 г", 400, "pikantnyy.jpg"),
  dish(
    "Салат селедка под шубой",
    "Салаты",
    "250 г",
    400,
    "herring-under-fur-coat.jpg",
  ),
  dish("Салат столичный", "Салаты", "250 г", 380, "stolichnyy.jpg"),
  dish("Салат Учкудук", "Салаты", "250 г", 400, "uchkuduk-salad.jpg"),
  dish("Салат ферганский", "Салаты", "200 г", 400, null),
  dish("Салат французский", "Салаты", "230 г", 380, "french-salad.jpg"),
  dish("Салат цезарь с курицей", "Салаты", "230 г", 450, "caesar-chicken.jpg"),
  dish("Салат шакароб", "Салаты", "250 г", 360, "shakarob.jpg"),
  dish("Фунчоза", "Салаты", "250 г", 400, "funchoza.jpg"),

  dish("Бефстроганов", "Горячие блюда", "300 г", 500, "beef-stroganoff.jpg"),
  dish("Долма", "Горячие блюда", "250 г", 420, "dolma.jpg"),
  dish(
    "Жареная курица с картофелем",
    "Горячие блюда",
    "350 г",
    450,
    "fried-chicken-potatoes.jpg",
  ),
  dish("Жареный лагман", "Горячие блюда", "320 г", 450, "fried-lagman.jpg"),
  dish(
    "Жаровня из куриного филе с овощами",
    "Горячие блюда",
    "300 г",
    450,
    "chicken-vegetable-skillet.jpg",
  ),
  dish("Казан-кебаб", "Горячие блюда", "450 г", 680, "kazan-kebab.jpg"),
  dish("Куриные ножки", "Горячие блюда", "250 г", 450, "chicken-legs.jpg"),
  dish("Манты", "Горячие блюда", "350 г", 480, "manti.jpg"),
  dish(
    "Мясо по-восточному",
    "Горячие блюда",
    "320 г",
    590,
    "oriental-meat.jpg",
  ),
  dish("Плов по-узбекски", "Горячие блюда", "350 г", 500, "uzbek-pilaf.jpg"),
  dish(
    "Уйгурская жаровня",
    "Горячие блюда",
    "300 г",
    440,
    "uyghur-skillet.jpg",
  ),
  dish("Уйгурский ганфан", "Горячие блюда", "400 г", 500, "uyghur-ganfan.jpg"),
  dish("Уйгурский лагман", "Горячие блюда", "320 г", 450, "uyghur-lagman.jpg"),

  dish(
    "Блины со сгущенкой",
    "Завтрак",
    "150 г",
    250,
    "pancakes-condensed-milk.jpeg",
  ),
  dish(
    "Блины со сметаной",
    "Завтрак",
    "150 г",
    250,
    "pancakes-sour-cream.jpeg",
  ),
  dish("Лепешка из тандыра", "Завтрак", "320 г", 120, "tandoor-flatbread.jpg"),
  dish("Чебурек с мясом", "Завтрак", "180 г", 270, "cheburek-meat.jpeg"),
  dish("Чебурек с сыром", "Завтрак", "180 г", 270, "cheburek-cheese.jpeg"),
  dish("Яичница", "Завтрак", "140 г", 250, "fried-eggs.jpg"),
  dish(
    "Яичница с колбасой",
    "Завтрак",
    "150 г",
    270,
    "fried-eggs-sausage.jpeg",
  ),

  dish("Голубцы", "Супы", "300 г", 400, null),
  dish("Куриный суп", "Супы", "300 г", 350, "chicken-soup.jpg"),
  dish("Суп борщ", "Супы", "300 г", 400, "borscht.jpg"),
  dish("Суп долма-шурпа", "Супы", "300 г", 400, "dolma-shurpa.jpg"),
  dish("Суп лагман", "Супы", "400 г", 420, null),
  dish("Суп мастава", "Супы", "300 г", 400, "mastava.jpg"),
  dish("Суп чучвара", "Супы", "300 г", 420, "chuchvara-soup.jpg"),

  dish("Куриные голени", "Шашлык", "300 г", 440, null),
  dish("Куриные крылышки", "Шашлык", "300 г", 430, null),
  dish("Стейк из сёмги", "Шашлык", "250 г", 600, "salmon-steak.jpg"),
  dish(
    "Шашлык из говяжьей мякоти",
    "Шашлык",
    "260 г",
    600,
    "beef-shashlik.jpg",
  ),
  dish(
    "Шашлык из куриного филе",
    "Шашлык",
    "250 г",
    440,
    "chicken-fillet-shashlik.jpg",
  ),
  dish(
    "Шашлык из окорочков",
    "Шашлык",
    "280 г",
    420,
    "chicken-thigh-shashlik.jpg",
  ),
  dish("Шашлычный микс", "Шашлык", "1 кг", 3900, "shashlik-mix.jpg"),

  dish("Ассорти солений", "Закуски", "400 г", 500, "pickles-assorted.jpg"),
  dish("Мясное ассорти", "Закуски", "300 г", 800, "meat-platter.jpg"),
  dish("Овощная нарезка", "Закуски", "400 г", 600, "vegetable-platter.jpg"),
  dish("Рыбное ассорти", "Закуски", "300 г", 800, "fish-platter.jpg"),
  dish("Селедка по-русски", "Закуски", "250 г", 400, "russian-herring.jpg"),
  dish("Фруктовое ассорти", "Закуски", "500 г", 700, "fruit-platter.jpg"),

  dish("Майонез", "Соусы", "50 г", 90, "mayonnaise.jpg"),
  dish("Сметана", "Соусы", "50 г", 90, "sour-cream.jpg"),
  dish("Соевый соус", "Соусы", "50 г", 90, null),
  dish("Соус тартар", "Соусы", "50 г", 110, "tartar-sauce.jpg"),
  dish("Соус чесночный", "Соусы", "50 г", 110, "garlic-sauce.jpg"),
  dish("Соус аджика", "Соусы", "50 г", 90, "adjika.jpg"),

  dish("Картофель Айдахо", "Гарниры", "170 г", 300, "idaho-potatoes.jpg"),
  dish("Картофель фри", "Гарниры", "170 г", 300, "french-fries.jpg"),
  dish("Овощи на мангале", "Гарниры", "200 г", 390, "grilled-vegetables.jpg"),
  dish("Пюре картофельное", "Гарниры", "170 г", 300, null),
  dish("Рис отварной", "Гарниры", "170 г", 250, "boiled-rice.jpg"),

  dish("Coca-Cola", "Напитки", "500 мл", 220, "coca-cola.jpg"),
  dish("Pepsi", "Напитки", "500 мл", 220, "pepsi.jpg"),
  dish("Вода Aqua Minerale", "Напитки", "500 мл", 190, "aqua-minerale.jpg"),
  dish(
    "Сок Добрый",
    "Напитки",
    "1 литр",
    350,
    "dobry-juice.jpg",
    "Выберите вкус: апельсин, вишня, мультифрукт, томатный или яблочный.",
  ),
];
