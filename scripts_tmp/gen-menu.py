# -*- coding: utf-8 -*-
"""Собирает prisma/menu-data.ts и изображения меню из папки D:\\Меню Ош-Сити."""
import os
import re
import shutil
import unicodedata

SRC = r"D:\Меню Ош-Сити"
DST_IMAGES = r"D:\Osh-City\public\menu"
OUT = r"D:\Osh-City\prisma\menu-data.ts"

CATEGORIES = [
    ("Завтраки", "Сытные завтраки: каши, блины, яичница"),
    ("Первые блюда", "Горячие супы и наваристые бульоны"),
    ("Вторые блюда", "Плов, лагман, манты и другие горячие блюда"),
    ("Мангал", "Шашлык, люля и крылышки на углях"),
    ("Салаты", "Свежие салаты и домашние соленья"),
    ("Выпечка", "Свежая выпечка из тандыра"),
    ("Десерты", "Сладкое к чаю"),
    ("Горячие напитки", "Чай на любой вкус"),
    ("Холодные напитки", "Прохладительные напитки, соки и лимонады"),
]

MAP = {
    "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "е": "e", "ё": "e",
    "ж": "zh", "з": "z", "и": "i", "й": "y", "к": "k", "л": "l", "м": "m",
    "н": "n", "о": "o", "п": "p", "р": "r", "с": "s", "т": "t", "у": "u",
    "ф": "f", "х": "h", "ц": "c", "ч": "ch", "ш": "sh", "щ": "sch", "ъ": "",
    "ы": "y", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}


def translit(text: str) -> str:
    text = text.lower()
    out = []
    for ch in text:
        if ch in MAP:
            out.append(MAP[ch])
        elif ch.isalnum() and ch.isascii():
            out.append(ch)
        else:
            out.append("-")
    slug = "".join(out)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug


VOL_RE = re.compile(r"[\s,]+(\d+(?:[.,]\d+)?)\s*(л|л\.|литр|литра)?\s*$", re.IGNORECASE)


def split_volume(name: str):
    """Возвращает (чистое имя, объём вроде '1 л' или None)."""
    m = VOL_RE.search(name)
    if not m:
        return name.strip(), None
    raw = m.group(1).replace(".", ",")
    unit = "л" if (m.group(2) or "л") else "л"
    volume = f"{raw} {unit}"
    base = name[: m.start()].strip(" ,-")
    return base, volume


def pretty(name: str, volume):
    """Красивое название блюда."""
    if name.startswith("Сок Добрый "):
        flavour = name[len("Сок Добрый "):].strip()
        name = f"Сок Добрый ({flavour})"
    name = re.sub(r"\s+", " ", name).strip()
    if volume:
        name = f"{name} {volume}"
    return name


def esc(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def main():
    os.makedirs(DST_IMAGES, exist_ok=True)

    lines = []
    lines.append("// Меню кафе «Ош-Сити» (Ленинский проспект, 148).")
    lines.append("// Источник позиций — папка «Меню Ош-Сити»: названия папок = категории,")
    lines.append("// названия файлов = названия блюд.")
    lines.append("// ВАЖНО: цены и часть составов загружаются позже — сейчас price = 0.")
    lines.append("")
    lines.append("export const categoriesSeed = [")
    for index, (name, description) in enumerate(CATEGORIES):
        sort_order = (index + 1) * 10
        lines.append(
            '  { name: "%s", sortOrder: %d, description: "%s" },'
            % (esc(name), sort_order, esc(description))
        )
    lines.append("] as const;")
    lines.append("")
    lines.append("type MenuSeedItem = {")
    lines.append("  name: string;")
    lines.append("  category: string;")
    lines.append("  price: number;")
    lines.append("  weight: string | null;")
    lines.append("  imageUrl: string | null;")
    lines.append("  sortOrder: number;")
    lines.append("  description: string;")
    lines.append("  ingredients: string | null;")
    lines.append("  allergens: string | null;")
    lines.append("  badges: string | null;")
    lines.append("};")
    lines.append("")
    lines.append("let order = 0;")
    lines.append("const dish = (")
    lines.append("  name: string,")
    lines.append("  category: string,")
    lines.append("  weight: string | null,")
    lines.append("  image: string | null,")
    lines.append("  description = \"\",")
    lines.append("): MenuSeedItem => ({")
    lines.append("  name,")
    lines.append("  category,")
    lines.append("  price: 0,")
    lines.append("  weight,")
    lines.append("  imageUrl: image ? `/menu/${image}` : null,")
    lines.append("  sortOrder: (order += 10),")
    lines.append("  description,")
    lines.append("  ingredients: null,")
    lines.append("  allergens: null,")
    lines.append("  badges: null,")
    lines.append("});")
    lines.append("")
    lines.append("export const menuItemsSeed: MenuSeedItem[] = [")

    total = 0
    todo = []
    new_images = set()
    for cat_index, (category, _description) in enumerate(CATEGORIES):
        folder = os.path.join(SRC, category)
        if not os.path.isdir(folder):
            raise SystemExit(f"Нет папки: {folder}")
        files = sorted(
            (f for f in os.listdir(folder) if os.path.isfile(os.path.join(folder, f))),
            key=lambda f: unicodedata.normalize("NFC", f).lower(),
        )
        if cat_index:
            lines.append("")
        lines.append("  // %s" % category)
        for filename in files:
            base, _ext = os.path.splitext(filename)
            ext = _ext.lower()
            base = unicodedata.normalize("NFC", base)
            clean, volume = split_volume(base)
            if not clean:
                clean = base
                volume = None
            name = pretty(clean, volume)
            slug = translit(base) or ("dish-%d" % total)
            image = slug + ext
            shutil.copy2(os.path.join(folder, filename), os.path.join(DST_IMAGES, image))
            new_images.add(image)
            lines.append(
                '  dish("%s", "%s", %s, "%s"),'
                % (esc(name), esc(category), ('"%s"' % esc(volume)) if volume else "null", image)
            )
            todo.append((category, name, volume))
            total += 1

    lines.append("];")
    lines.append("")

    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines))

    # 2. Новые фото уже на месте — теперь убираем фото прежнего меню.
    removed = 0
    for old in os.listdir(DST_IMAGES):
        if old in new_images:
            continue
        path = os.path.join(DST_IMAGES, old)
        if os.path.isfile(path):
            os.remove(path)
            removed += 1

    # 2. Список позиций без цен — пользователь заполнит позже.
    todo_lines = [
        "# Цены и составы — к заполнению",
        "",
        "Меню кафе «Ош-Сити» (Ленинский проспект, 148) уже загружено в приложение,",
        "но для всех позиций пока стоит `price: 0` и пустое описание.",
        "Ниже список позиций из файла `prisma/menu-data.ts`, которые нужно заполнить.",
        "",
        "| Категория | Блюдо | Вес/объём | Цена | Состав |",
        "| --- | --- | --- | --- | --- |",
    ]
    for category, name, volume in todo:
        todo_lines.append("| %s | %s | %s |  |  |" % (category, name, volume or ""))
    todo_lines.append("")
    todo_lines.append("Всего позиций: %d." % total)
    todo_lines.append("")
    todo_lines.append("Как заполнить:")
    todo_lines.append("")
    todo_lines.append("1. Вписать цены в `prisma/menu-data.ts` (поле `price`, целое число в рублях).")
    todo_lines.append("2. Вписать составы в четвёртый аргумент функции `dish(...)` (описание блюда).")
    todo_lines.append("3. Применить меню: `npm run db:replace-menu` (или `npm run db:seed`).")
    todo_lines.append("")

    with open(r"D:\Osh-City\PRICE_TODO.md", "w", encoding="utf-8") as fh:
        fh.write("\n".join(todo_lines))

    print("categories:", len(CATEGORIES))
    print("dishes:", total)
    print("old images removed:", removed)


if __name__ == "__main__":
    main()
