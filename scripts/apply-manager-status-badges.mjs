import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv.find((value) => value.startsWith("--root="))?.slice(7) ?? ".");
const globalsPath = path.join(root, "src/app/globals.css");
if (!fs.existsSync(globalsPath)) throw new Error(`Не найден ${globalsPath}`);

let css = fs.readFileSync(globalsPath, "utf8");
css = css
  .replace(/^@import ["']\.\/manager-active-status-fix\.css["'];\s*/m, "")
  .replace(/^@import ["']\.\/manager-status-badges\.css["'];\s*/m, "");

const importLine = '@import "./manager-status-badges.css";';
const imports = css.match(/^(?:@import[^\n]*;\s*)+/)?.[0] ?? "";
css = imports
  ? `${imports.trimEnd()}\n${importLine}\n${css.slice(imports.length)}`
  : `${importLine}\n${css}`;

fs.writeFileSync(globalsPath, css);
console.log("✅ Статусы «Активен» и «Отключён» сделаны одинаково заметными");
