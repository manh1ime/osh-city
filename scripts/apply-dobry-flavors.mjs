import fs from "node:fs";

const path = process.argv[2] ?? "src/components/guest/GuestMenu.tsx";
let source = fs.readFileSync(path, "utf8");
const original = source;

function replaceOnce(search, replacement, label) {
  const count = source.split(search).length - 1;
  if (count !== 1)
    throw new Error(`${label}: ожидалось 1 совпадение, найдено ${count}`);
  source = source.replace(search, replacement);
}

replaceOnce(
  "type CartLine = { itemId: string; quantity: number; comment: string };",
  "type CartLine = { itemId: string; quantity: number; comment: string; variant?: string };",
  "тип корзины",
);
replaceOnce(
  "const LIMITS = {",
  'const DOBRY_FLAVORS = ["Апельсин", "Вишня", "Мультифрукт", "Томатный", "Яблочный"] as const;\nconst isDobryJuice = (item: GuestItemDto) => item.name.trim().toLocaleLowerCase("ru-RU") === "сок добрый";\n\nconst LIMITS = {',
  "список вкусов",
);
replaceOnce(
  "    origin?: DOMRect,\n  ) {",
  '    origin?: DOMRect,\n    variant = "",\n  ) {',
  "аргумент вкуса",
);
replaceOnce(
  "(line) => line.itemId === itemId && line.comment === comment,",
  '(line) => line.itemId === itemId && line.comment === comment && (line.variant ?? "") === variant,',
  "ключ позиции",
);
replaceOnce(
  "{ itemId, quantity: Math.min(LIMITS.maxQuantity, quantity), comment },",
  "{ itemId, quantity: Math.min(LIMITS.maxQuantity, quantity), comment, variant: variant || undefined },",
  "сохранение вкуса",
);
replaceOnce(
  "            comment: line.comment || undefined,",
  '            comment: [line.variant ? `Вкус: ${line.variant}` : "", line.comment].filter(Boolean).join(" · ") || undefined,',
  "отправка вкуса",
);
replaceOnce(
  "                          addToCart(\n                            item.id,",
  "                          if (isDobryJuice(item)) {\n                            setOpenItem(item);\n                            return;\n                          }\n                          addToCart(\n                            item.id,",
  "открытие выбора из карточки",
);
replaceOnce(
  "          onAdd={(quantity, comment, origin) => {\n            addToCart(openItem.id, quantity, comment, origin);",
  "          onAdd={(quantity, comment, origin, variant) => {\n            addToCart(openItem.id, quantity, comment, origin, variant);",
  "передача вкуса",
);
replaceOnce(
  "                        {line.comment ? (",
  '                        {line.variant ? (\n                          <p className="mt-0.5 text-xs font-semibold text-wine-700">\n                            Вкус: {line.variant}\n                          </p>\n                        ) : null}\n                        {line.comment ? (',
  "вкус в корзине",
);
replaceOnce(
  "  onAdd: (quantity: number, comment: string, origin: DOMRect) => void;",
  "  onAdd: (quantity: number, comment: string, origin: DOMRect, variant: string) => void;",
  "тип добавления",
);
replaceOnce(
  '  const [comment, setComment] = useState("");',
  '  const [comment, setComment] = useState("");\n  const [variant, setVariant] = useState<string>(() => isDobryJuice(item) ? DOBRY_FLAVORS[0] : "");',
  "состояние вкуса",
);
replaceOnce(
  '          <div className="mt-5">\n            <label className="label" htmlFor="item-comment">',
  '          {isDobryJuice(item) ? (\n            <div className="mt-5">\n              <label className="label" htmlFor="item-variant">Вкус сока</label>\n              <select id="item-variant" value={variant} onChange={(event) => setVariant(event.target.value)} className="input">\n                {DOBRY_FLAVORS.map((flavor) => <option key={flavor} value={flavor}>{flavor}</option>)}\n              </select>\n            </div>\n          ) : null}\n\n          <div className="mt-5">\n            <label className="label" htmlFor="item-comment">',
  "селектор вкуса",
);
replaceOnce(
  "                event.currentTarget.getBoundingClientRect(),\n              )",
  "                event.currentTarget.getBoundingClientRect(),\n                variant,\n              )",
  "выбранный вкус",
);

if (source === original) throw new Error("Файл не изменён");
fs.writeFileSync(path, source);
console.log(`✅ Добавлен выбор вкуса Сока Добрый: ${path}`);
