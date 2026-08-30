import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv.find((value) => value.startsWith("--root="))?.slice(7) ?? ".");
const globalsPath = path.join(root, "src/app/globals.css");
const staffLayoutPath = path.join(root, "src/app/staff/layout.tsx");
const managerLayoutPath = path.join(root, "src/app/manager/layout.tsx");

if (!fs.existsSync(globalsPath)) throw new Error(`Не найден ${globalsPath}`);
let globals = fs.readFileSync(globalsPath, "utf8");
globals = globals
  .replace(/^@import ["']\.\/eastern-night\.css["'];\s*/m, "")
  .replace(/^@import ["']\.\/eastern-night-panels\.css["'];\s*/m, "");
globals = `@import "./eastern-night.css";\n@import "./eastern-night-panels.css";\n${globals}`;
fs.writeFileSync(globalsPath, globals);
console.log("✓ Стили панелей подключены");

function addClass(file, from, to, label) {
  if (!fs.existsSync(file)) return;
  let source = fs.readFileSync(file, "utf8");
  if (source.includes(to)) return console.log(`✓ ${label} уже оформлена`);
  if (!source.includes(from)) return console.log(`• ${label}: используется автоматическое определение темы`);
  source = source.replace(from, to);
  fs.writeFileSync(file, source);
  console.log(`✓ ${label} оформлена`);
}

addClass(staffLayoutPath, 'className="staff-theme ', 'className="staff-theme eastern-night-staff-panel ', "Панель официанта");

if (fs.existsSync(managerLayoutPath)) {
  let source = fs.readFileSync(managerLayoutPath, "utf8");
  if (!source.includes("eastern-night-manager-panel")) {
    if (source.includes('className="manager-theme ')) {
      source = source.replace('className="manager-theme ', 'className="manager-theme eastern-night-manager-panel ');
    } else {
      source = source.replace(/className="([^"]*min-h-screen[^"]*)"/, 'className="eastern-night-manager-panel $1"');
    }
    fs.writeFileSync(managerLayoutPath, source);
  }
  console.log("✓ Панель менеджера оформлена");
}

console.log("✅ Панели официанта и менеджера переведены в стиль Восточная ночь");
