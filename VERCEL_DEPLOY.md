# Vercel deployment: Ош-Сити

Приложение можно развернуть на Vercel как временный staging или production preview. Vercel отвечает за Next.js, а PostgreSQL нужно подключить отдельно: Neon, Supabase или другой совместимый PostgreSQL.

## 1. Подготовить PostgreSQL

Создайте базу PostgreSQL и сохраните две строки подключения:

- `DATABASE_URL`: pooled/runtime connection string;
- `DIRECT_URL`: direct/session connection string для Prisma migrations.

Обе строки должны указывать на одну базу. Не добавляйте их в Git.

## 2. Импортировать схему и данные

В PowerShell временно задайте переменные облачной базы и выполните из корня проекта:

```powershell
$env:DATABASE_URL="postgresql://..."
$env:DIRECT_URL="postgresql://..."
npx prisma migrate deploy
npm run db:seed
```

`db:seed` применяет текущий каталог меню, создает ресторан, филиал, столы и демо-сотрудников. Не запускайте seed поверх базы с реальными изменениями без backup и проверки его логики.

После заполнения реальной цены `Мохито лайм 0,45 л` выполните seed повторно.

## 3. Создать проект Vercel

1. Импортируйте Git-репозиторий в Vercel.
2. Framework Preset: `Next.js`.
3. Root Directory: корень репозитория.
4. Build Command: `npm run build`.
5. Install Command: `npm ci`.
6. Output Directory: оставить значение Vercel по умолчанию.
7. Не добавляйте Docker-команду: Dockerfile и `docker-compose.yml` предназначены для VPS, не для Vercel.

## 4. Переменные Vercel

Добавьте их для `Preview` и `Production` отдельно:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
AUTH_SECRET=<случайная строка минимум 32 символа>
HASH_SALT=<другая случайная строка минимум 32 символа>
RESTAURANT_SLUG=osh-city
NEXT_PUBLIC_APP_URL=https://<ваш-vercel-домен>
SEED_DEMO_PASSWORD=<временный сложный пароль>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<публичный VAPID ключ>
VAPID_PRIVATE_KEY=<приватный VAPID ключ>
VAPID_SUBJECT=mailto:<ваш-email>
```

Для временного staging можно использовать домен `*.vercel.app`. После привязки собственного домена замените `NEXT_PUBLIC_APP_URL` и сделайте новый deploy, потому что публичный URL используется в QR-ссылках.

## 5. Проверки до первого deploy

Локально:

```powershell
npm test
npm run typecheck
npx next build
```

После подключения облачной базы:

```powershell
$env:NEXT_PUBLIC_APP_URL="https://<ваш-vercel-домен>"
npm run verify:deploy
```

Проверка завершится ошибкой, если:

- отсутствует обязательная переменная;
- секрет слишком короткий;
- URL не использует HTTPS;
- ресторан/филиал/столы/категории/меню не созданы;
- активное блюдо имеет цену `0` или меньше.

## 6. Проверки после deploy

Откройте:

```text
https://<домен>/api/health
https://<домен>/
https://<домен>/menu/<token-стола>
https://<домен>/staff/login
https://<домен>/manager/login
https://<домен>/sw.js
```

Ожидается:

- health возвращает `ok: true`;
- главная и QR-меню возвращают `200`;
- неправильный QR API возвращает `404`;
- неавторизованный `/manager` редиректит на `/manager/login`;
- официант при открытии `/manager` получает редирект на страницу входа;
- `sw.js` возвращает `200`;
- в браузерной консоли нет ошибок.

Затем выполните один реальный staging-заказ по QR, проверьте его в панели официанта и переведите по статусам. Не используйте production-деньги или реальные данные гостей на preview без согласования.

## 7. Важные ограничения Vercel

- Prisma migration не запускается автоматически из `build` и должна быть выполнена отдельно до первого использования базы.
- Не запускайте `prisma db push` для production-базы.
- Не запускайте `npm run db:seed` после ручного редактирования меню без проверки: seed синхронизирует позиции и цены из `prisma/menu-data.ts`.
- Push-уведомления требуют HTTPS и корректные VAPID-ключи.
- На iPhone push требует добавления сайта на домашний экран.
- Для production включите backup базы у выбранного PostgreSQL-провайдера.
