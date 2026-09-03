# Развертывание «Учкудук» на Timeweb Cloud VPS

Инструкция рассчитана на чистый VPS с Ubuntu 24.04, публичным IPv4 и доменом.
Текущий Netlify/Neon не изменяется до завершения проверки на VPS.

## 1. Подготовить VPS

Подключиться по SSH под пользователем с sudo и установить Docker:

```bash
sudo apt update
sudo apt install -y ca-certificates curl git ufw
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
```

Переподключиться по SSH после добавления в группу Docker.

Открыть только SSH, HTTP и HTTPS:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Порт PostgreSQL наружу не открывать.

## 2. Загрузить проект

```bash
sudo mkdir -p /opt/uchkuduk
sudo chown "$USER":"$USER" /opt/uchkuduk
cd /opt/uchkuduk
git clone YOUR_REPOSITORY_URL .
```

Если проект переносится архивом, распаковать только исходные файлы. Не переносить `.env`, `.next`, `node_modules`, backup и временные ZIP-файлы.

## 3. Создать production environment

```bash
cp .env.production.example .env.production
nano .env.production
```

Заменить:

- `POSTGRES_PASSWORD` на длинный случайный пароль;
- `AUTH_SECRET` на отдельный случайный секрет;
- `HASH_SALT` на другой случайный секрет;
- `NEXT_PUBLIC_APP_URL` на реальный HTTPS-адрес;
- ключи VAPID для push-уведомлений (см. ниже).

Сгенерировать секреты можно так:

```bash
openssl rand -hex 32
```

Ключи VAPID генерируются отдельной парой:

```bash
docker run --rm node:22-alpine npx -y web-push generate-vapid-keys
```

Публичный ключ идёт в `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, приватный — в
`VAPID_PRIVATE_KEY`, контакт администратора — в `VAPID_SUBJECT`. Ключи из
репозитория использовать нельзя: приватный ключ должен быть только на сервере.

Без ключей приложение запустится, но уведомления будут приходить только в
открытую вкладку панели, а не на телефон сотрудника.

Защитить файл:

```bash
chmod 600 .env.production
```

## 4. Запустить приложение и PostgreSQL

```bash
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs -f app
```

Контейнер приложения перед запуском выполняет:

```bash
npx prisma migrate deploy
```

Затем запускается Next.js. Seed автоматически не запускается, чтобы не перезаписать production-данные.

## 5. Первичное заполнение

Если база новая и нужны демонстрационные данные, запускать seed отдельно и осознанно:

```bash
docker compose --env-file .env.production exec app npm run db:seed
```

Для переноса существующей Neon-базы сначала восстановить backup в PostgreSQL-контейнер, затем выполнить `prisma migrate deploy`.

## 6. HTTPS через Caddy

Установить Caddy или запустить его отдельным сервисом. Минимальный Caddyfile:

```text
your-domain.ru {
    reverse_proxy 127.0.0.1:3000
}
```

До запуска Caddy направить A-запись домена на IP VPS. Caddy автоматически получит и продлит сертификат Let's Encrypt.

## 7. Backup PostgreSQL

Создать каталог вне Git:

```bash
sudo mkdir -p /var/backups/uchkuduk
sudo chmod 700 /var/backups/uchkuduk
```

Создать backup:

```bash
docker compose --env-file .env.production exec -T db \
  sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc --no-owner --no-privileges' \
  > "/var/backups/uchkuduk/uchkuduk-$(date +%Y%m%d-%H%M%S).dump"
```

Команду выполнять из shell, где загружены значения `.env.production`, либо заменить значения на свои. Одну копию обязательно отправлять за пределы VPS.

Проверить архив:

```bash
docker compose --env-file .env.production exec -T db \
  pg_restore --list < /var/backups/uchkuduk/FILE.dump
```

Периодически проверять восстановление в отдельную тестовую базу. Backup на том же диске не считается единственной защитой.

## 8. Обновление приложения

```bash
cd /opt/uchkuduk
git pull --ff-only
docker compose --env-file .env.production up -d --build
docker compose --env-file .env.production logs --tail=100 app
```

## 9. Проверка после запуска

```bash
curl -I https://your-domain.ru/
curl -I https://your-domain.ru/manager
curl -I https://your-domain.ru/staff/orders
curl -I https://your-domain.ru/sw.js
curl -s https://your-domain.ru/api/health
```

Ожидается:

- главная страница: `200`;
- `/manager` без cookie: редирект на вход;
- `/staff/orders` без cookie: редирект на вход;
- `/sw.js`: `200` (без service worker push не работает);
- `/api/health`: `"ok": true` и заполненные счётчики меню.

После этого вручную проверить QR-меню обоих филиалов, две брони, предзаказы,
роли и отмену брони.

## 10. Проверка push-уведомлений

Уведомления требуют HTTPS: на `http://IP` браузер запретит и service worker,
и подписку. Сначала настроить домен и сертификат из шага 6.

1. Войти в панель персонала с телефона по адресу домена.
2. Открыть раздел «Уведомления» — там видно, настроены ли ключи VAPID.
3. Нажать колокольчик → «Включить уведомления на телефон» → разрешить в браузере.
4. Нажать «Отправить тестовое уведомление»: оно должно прийти в течение
   нескольких секунд, в том числе при свёрнутом браузере.
5. Для проверки боем: с другого устройства сделать заказ по QR-коду и убедиться,
   что уведомление пришло официанту нужного филиала.

На iPhone push работает только из приложения, добавленного на домашний экран:
«Поделиться» → «На экран Домой», затем открывать панель с этой иконки.
Это ограничение Safari, обойти его нельзя. На Android достаточно разрешения
в браузере.

Если уведомления не приходят, проверить по порядку: HTTPS-адрес без префикса
превью-домена, `/sw.js` отдаёт `200`, ключи VAPID заданы в `.env.production`,
режим «Не беспокоить» на телефоне выключен.

## Безопасность

- Не публиковать порт `5432`.
- Не хранить `.env.production` в Git.
- Не запускать `prisma db push` в production.
- Не запускать `prisma migrate reset` в production.
- Перед миграцией делать backup.
- Не запускать `db:seed` поверх существующих данных без проверки его логики.
