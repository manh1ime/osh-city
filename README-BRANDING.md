# Брендинг кафе «Ош-Сити»

Кафе работает по одному адресу: **Ленинский проспект, 148**.
Телефон для гостей: **+7(931)392-00-02**.

Название, адрес и телефон заданы в коде, поэтому менять базу вручную не нужно:

| Что | Где |
| --- | --- |
| Название и слаг ресторана | `prisma/seed-data.ts` → `restaurantSeed`, `src/lib/restaurant.ts` |
| Единственный филиал, адрес | `src/lib/branches.ts` → `DEFAULT_BRANCHES`, `prisma/seed-data.ts` → `branchesSeed` |
| Телефон | `src/lib/branches.ts` → `RESTAURANT_PHONE` / `RESTAURANT_PHONE_HREF` |
| Название в шапке и PWA | `src/app/layout.tsx`, `src/app/manifest.ts`, `src/components/brand/Logo.tsx` |

## Выбор филиала убран

Раньше у кафе было два филиала и гость выбирал зал. Сейчас филиал ровно один, поэтому:

- на страницах нет переключателя филиала;
- бронь, заказы и столы всегда относятся к единственному залу;
- если в базе остались старые филиалы, `ensureBranches()` и сид помечают их неактивными —
  удалять их нельзя, на них ссылаются старые заказы и брони.

## Применение к существующей базе

```bash
npx prisma db execute --file "prisma/replace-branding.sql" --schema "prisma/schema.prisma"
npx tsx prisma/seed.ts
```

`prisma/replace-branding.sql` приводит название, адрес и телефон ресторана к актуальным
значениям и отключает всё, что не относится к единственному филиалу.

## Проверка

```bash
npm run build
```

Старых адресов и прежнего названия в проекте быть не должно:

```bash
rg -n -i "учкудук|васильевск|садовая" . --glob "!node_modules/**" --glob "!.git/**" --glob "!.next/**"
```
