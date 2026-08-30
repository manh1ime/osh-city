import fs from "node:fs";
const path = process.argv[2] ?? "prisma/seed.ts";
let source = fs.readFileSync(path, "utf8");
if (source.includes('from "./menu-data"')) {
  console.log("✅ seed.ts уже использует новое меню");
  process.exit(0);
}
source = source
  .replace(/^\s*categoriesSeed,\r?\n/m, "")
  .replace(/^\s*menuItemsSeed,\r?\n/m, "");
const marker = '} from "./seed-data";';
if (!source.includes(marker))
  throw new Error("Не найден импорт ./seed-data в prisma/seed.ts");
source = source.replace(
  marker,
  `${marker}\nimport { categoriesSeed, menuItemsSeed } from "./menu-data";`,
);
fs.writeFileSync(path, source);
console.log(`✅ Обновлён импорт меню: ${path}`);
