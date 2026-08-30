import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv.find((value) => value.startsWith("--root="))?.slice(7) ?? ".");
const globalsPath = path.join(root, "src/app/globals.css");
const landingPath = path.join(root, "src/components/landing/LandingPage.tsx");
const seedPath = path.join(root, "prisma/seed-data.ts");

if (!fs.existsSync(globalsPath)) throw new Error(`Не найден ${globalsPath}`);
let globals = fs.readFileSync(globalsPath, "utf8");
const importLine = '@import "./eastern-night.css";';
if (!globals.includes(importLine)) {
  globals = `${importLine}\n${globals}`;
  fs.writeFileSync(globalsPath, globals);
  console.log("✓ Подключена глобальная тема");
} else console.log("✓ Глобальная тема уже подключена");

if (fs.existsSync(landingPath)) {
  let landing = fs.readFileSync(landingPath, "utf8");
  landing = landing.replace(/4[,.][0-9]/g, "4,4");
  if (!landing.includes("eastern-night-rating")) {
    const marker = '<div className="mt-8 flex flex-wrap gap-3">';
    if (!landing.includes(marker)) throw new Error("Не найден блок кнопок на гостевой странице");
    landing = landing.replace(marker, `<div className="eastern-night-rating" aria-label="Оценка кафе 4,4 из 5">\n            <strong>4,4</strong>\n            <span>оценка гостей</span>\n          </div>\n          ${marker}`);
  }
  fs.writeFileSync(landingPath, landing);
  console.log("✓ Гостевая страница обновлена, оценка 4,4");
}

if (fs.existsSync(seedPath)) {
  let seed = fs.readFileSync(seedPath, "utf8");
  seed = seed.replace(/primaryColor:\s*"#[0-9a-fA-F]{6}"/, 'primaryColor: "#D7AA50"');
  seed = seed.replace(/coverImageUrl:\s*"[^"]*"/, 'coverImageUrl: "/images/eastern-night-hero.webp"');
  fs.writeFileSync(seedPath, seed);
  console.log("✓ Seed настроен на Восточную ночь");
}

console.log("✅ Тема Восточная ночь применена ко всему приложению");
