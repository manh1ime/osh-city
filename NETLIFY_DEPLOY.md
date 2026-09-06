# Netlify deployment: Ош-Сити

## 1. Подключить репозиторий

В Netlify создайте новый site через `Add new site` -> `Import an existing project` и выберите GitHub-репозиторий `manh1ime/osh-city`.

В корне репозитория уже есть `netlify.toml` со следующими настройками:

- Build command: `npm run build`
- Publish directory: `.next`
- Node.js: `22`
- Next.js runtime: `@netlify/plugin-nextjs`

Не используйте Dockerfile для Netlify. Он нужен для VPS.

## 2. Подключить PostgreSQL

Создайте PostgreSQL в Neon, Supabase или другом совместимом сервисе. Нужны две строки подключения к одной базе:

- `DATABASE_URL`: pooled/runtime connection string;
- `DIRECT_URL`: direct/session connection string для Prisma.

В Netlify откройте `Site configuration` -> `Environment variables` и добавьте переменные для `Production` и, при необходимости, `Deploy previews`:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
AUTH_SECRET=<случайная строка минимум 32 символа>
HASH_SALT=<другая случайная строка минимум 32 символа>
RESTAURANT_SLUG=osh-city
NEXT_PUBLIC_APP_URL=https://<имя-сайта>.netlify.app
SEED_DEMO_PASSWORD=<временный сложный пароль>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<публичный VAPID ключ>
VAPID_PRIVATE_KEY=<приватный VAPID ключ>
VAPID_SUBJECT=mailto:<ваш-email>
```

`NEXT_PUBLIC_APP_URL` должен быть полным HTTPS URL без завершающего `/`. После подключения собственного домена замените эту переменную и запустите новый deploy: она используется в QR-ссылках.

## 3. Применить схему и демо-данные

До первого использования production site выполните миграции локально, указав именно credentials облачной базы:

```powershell
$env:DATABASE_URL="postgresql://..."
$env:DIRECT_URL="postgresql://..."
npx prisma migrate deploy
npm run db:seed
```

Для дальнейших миграций используется:

```powershell
npm run db:migrate:deploy
```

Не запускайте `prisma db push` в production. Не запускайте seed поверх базы с ручными изменениями без backup и проверки логики seed.

## 4. Проверить deploy

После успешной публикации проверьте:

```text
https://<домен>/api/health
https://<домен>/
https://<домен>/menu/<token-стола>
https://<домен>/staff/login
https://<домен>/manager/login
https://<домен>/sw.js
```

Ожидается, что health возвращает `ok: true`, главная и QR-меню открываются, `/staff/login` и `/manager/login` доступны, а `sw.js` возвращает `200`.

После этого выполните один staging-заказ по QR и проверьте его в панели официанта.

## 5. Частые проблемы

- `P2021` означает, что миграции не применены к базе, указанной в `DATABASE_URL`.
- Ошибка подключения Prisma обычно означает, что `DATABASE_URL` и `DIRECT_URL` перепутаны или не указывают на одну базу.
- Пустой или неверный QR URL означает, что `NEXT_PUBLIC_APP_URL` задан до подключения итогового домена или содержит завершающий `/`.
- Push-уведомления без VAPID-переменных не работают в закрытой вкладке.
- Не добавляйте `.env` файлы в Git.
