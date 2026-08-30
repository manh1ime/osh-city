# Учкудук: структура проекта после переименования

Служебные папки маршрутов убраны, файлы лежат в своих разделах с уникальными именами.

```
uchkuduk/
├─ prisma/
│  ├─ schema.prisma
│  ├─ seed-data.ts
│  └─ seed.ts
├─ src/
│  ├─ actions/
│  │  ├─ actions-auth.ts
│  │  ├─ actions-menu.ts
│  │  ├─ actions-orders.ts
│  │  ├─ calls.ts
│  │  ├─ categories.ts
│  │  ├─ security.ts
│  │  ├─ settings.ts
│  │  ├─ staff.ts
│  │  └─ tables.ts
│  ├─ app/
│  │  ├─ admin/
│  │  │  ├─ admin-categories-page.tsx
│  │  │  ├─ admin-layout.tsx
│  │  │  ├─ admin-login-page.tsx
│  │  │  ├─ admin-menu-page.tsx
│  │  │  ├─ admin-orders-page.tsx
│  │  │  ├─ admin-page.tsx
│  │  │  ├─ admin-security-page.tsx
│  │  │  ├─ admin-settings-page.tsx
│  │  │  ├─ admin-staff-page.tsx
│  │  │  └─ admin-tables-page.tsx
│  │  ├─ api/
│  │  │  ├─ api-admin-table-id-qr-route.ts
│  │  │  ├─ api-guest-call-route.ts
│  │  │  ├─ api-guest-order-id-route.ts
│  │  │  ├─ api-guest-order-route.ts
│  │  │  └─ api-staff-feed-route.ts
│  │  ├─ menu/
│  │  │  └─ menu-table-token-page.tsx
│  │  ├─ order/
│  │  │  └─ order-id-page.tsx
│  │  ├─ staff/
│  │  │  ├─ staff-calls-page.tsx
│  │  │  ├─ staff-layout.tsx
│  │  │  ├─ staff-login-page.tsx
│  │  │  ├─ staff-order-id-page.tsx
│  │  │  └─ staff-orders-page.tsx
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ components/
│  │  ├─ admin/
│  │  │  ├─ AdminShell.tsx
│  │  │  ├─ CategoryManager.tsx
│  │  │  ├─ MenuManager.tsx
│  │  │  ├─ Modal.tsx
│  │  │  ├─ SecurityForm.tsx
│  │  │  ├─ SettingsForm.tsx
│  │  │  ├─ StaffManager.tsx
│  │  │  └─ TableManager.tsx
│  │  ├─ auth/
│  │  │  └─ LoginForm.tsx
│  │  ├─ guest/
│  │  │  ├─ GuestMenu.tsx
│  │  │  └─ OrderStatusLive.tsx
│  │  └─ staff/
│  │     ├─ OrderActions.tsx
│  │     └─ OrdersBoard.tsx
│  ├─ lib/
│  │  ├─ audit.ts
│  │  ├─ db.ts
│  │  ├─ format.ts
│  │  ├─ hash.ts
│  │  ├─ lib-auth.ts
│  │  ├─ lib-menu.ts
│  │  ├─ lib-orders.ts
│  │  ├─ permissions.ts
│  │  ├─ rate-limit.ts
│  │  ├─ restaurant.ts
│  │  ├─ session-token.ts
│  │  ├─ staff-dto.ts
│  │  └─ validation.ts
│  └─ middleware.ts
├─ .env.example
├─ .gitignore
├─ README.md
├─ docker-compose.yml
├─ next.config.mjs
├─ package.json
├─ postcss.config.mjs
├─ tailwind.config.ts
└─ tsconfig.json
```

Всего файлов: 73. Переименовано: 28. Импорты правлены в 32 файлах.

## Было → Стало

| Было | Стало |
| --- | --- |
| `.env.example` | `.env.example` |
| `.gitignore` | `.gitignore` |
| `README.md` | `README.md` |
| `docker-compose.yml` | `docker-compose.yml` |
| `next.config.mjs` | `next.config.mjs` |
| `package.json` | `package.json` |
| `postcss.config.mjs` | `postcss.config.mjs` |
| `prisma/schema.prisma` | `prisma/schema.prisma` |
| `prisma/seed-data.ts` | `prisma/seed-data.ts` |
| `prisma/seed.ts` | `prisma/seed.ts` |
| `src/actions/auth.ts` | `src/actions/actions-auth.ts` |
| `src/actions/menu.ts` | `src/actions/actions-menu.ts` |
| `src/actions/orders.ts` | `src/actions/actions-orders.ts` |
| `src/actions/calls.ts` | `src/actions/calls.ts` |
| `src/actions/categories.ts` | `src/actions/categories.ts` |
| `src/actions/security.ts` | `src/actions/security.ts` |
| `src/actions/settings.ts` | `src/actions/settings.ts` |
| `src/actions/staff.ts` | `src/actions/staff.ts` |
| `src/actions/tables.ts` | `src/actions/tables.ts` |
| `src/app/admin/categories/page.tsx` | `src/app/admin/admin-categories-page.tsx` |
| `src/app/admin/layout.tsx` | `src/app/admin/admin-layout.tsx` |
| `src/app/admin/login/page.tsx` | `src/app/admin/admin-login-page.tsx` |
| `src/app/admin/menu/page.tsx` | `src/app/admin/admin-menu-page.tsx` |
| `src/app/admin/orders/page.tsx` | `src/app/admin/admin-orders-page.tsx` |
| `src/app/admin/page.tsx` | `src/app/admin/admin-page.tsx` |
| `src/app/admin/security/page.tsx` | `src/app/admin/admin-security-page.tsx` |
| `src/app/admin/settings/page.tsx` | `src/app/admin/admin-settings-page.tsx` |
| `src/app/admin/staff/page.tsx` | `src/app/admin/admin-staff-page.tsx` |
| `src/app/admin/tables/page.tsx` | `src/app/admin/admin-tables-page.tsx` |
| `src/app/api/admin/tables/[tableId]/qr/route.ts` | `src/app/api/api-admin-table-id-qr-route.ts` |
| `src/app/api/guest/call/route.ts` | `src/app/api/api-guest-call-route.ts` |
| `src/app/api/guest/order/[orderId]/route.ts` | `src/app/api/api-guest-order-id-route.ts` |
| `src/app/api/guest/order/route.ts` | `src/app/api/api-guest-order-route.ts` |
| `src/app/api/staff/feed/route.ts` | `src/app/api/api-staff-feed-route.ts` |
| `src/app/globals.css` | `src/app/globals.css` |
| `src/app/layout.tsx` | `src/app/layout.tsx` |
| `src/app/menu/[tableToken]/page.tsx` | `src/app/menu/menu-table-token-page.tsx` |
| `src/app/order/[orderId]/page.tsx` | `src/app/order/order-id-page.tsx` |
| `src/app/page.tsx` | `src/app/page.tsx` |
| `src/app/staff/calls/page.tsx` | `src/app/staff/staff-calls-page.tsx` |
| `src/app/staff/layout.tsx` | `src/app/staff/staff-layout.tsx` |
| `src/app/staff/login/page.tsx` | `src/app/staff/staff-login-page.tsx` |
| `src/app/staff/orders/[orderId]/page.tsx` | `src/app/staff/staff-order-id-page.tsx` |
| `src/app/staff/orders/page.tsx` | `src/app/staff/staff-orders-page.tsx` |
| `src/components/admin/AdminShell.tsx` | `src/components/admin/AdminShell.tsx` |
| `src/components/admin/CategoryManager.tsx` | `src/components/admin/CategoryManager.tsx` |
| `src/components/admin/MenuManager.tsx` | `src/components/admin/MenuManager.tsx` |
| `src/components/admin/Modal.tsx` | `src/components/admin/Modal.tsx` |
| `src/components/admin/SecurityForm.tsx` | `src/components/admin/SecurityForm.tsx` |
| `src/components/admin/SettingsForm.tsx` | `src/components/admin/SettingsForm.tsx` |
| `src/components/admin/StaffManager.tsx` | `src/components/admin/StaffManager.tsx` |
| `src/components/admin/TableManager.tsx` | `src/components/admin/TableManager.tsx` |
| `src/components/auth/LoginForm.tsx` | `src/components/auth/LoginForm.tsx` |
| `src/components/guest/GuestMenu.tsx` | `src/components/guest/GuestMenu.tsx` |
| `src/components/guest/OrderStatusLive.tsx` | `src/components/guest/OrderStatusLive.tsx` |
| `src/components/staff/OrderActions.tsx` | `src/components/staff/OrderActions.tsx` |
| `src/components/staff/OrdersBoard.tsx` | `src/components/staff/OrdersBoard.tsx` |
| `src/lib/audit.ts` | `src/lib/audit.ts` |
| `src/lib/db.ts` | `src/lib/db.ts` |
| `src/lib/format.ts` | `src/lib/format.ts` |
| `src/lib/hash.ts` | `src/lib/hash.ts` |
| `src/lib/auth.ts` | `src/lib/lib-auth.ts` |
| `src/lib/menu.ts` | `src/lib/lib-menu.ts` |
| `src/lib/orders.ts` | `src/lib/lib-orders.ts` |
| `src/lib/permissions.ts` | `src/lib/permissions.ts` |
| `src/lib/rate-limit.ts` | `src/lib/rate-limit.ts` |
| `src/lib/restaurant.ts` | `src/lib/restaurant.ts` |
| `src/lib/session-token.ts` | `src/lib/session-token.ts` |
| `src/lib/staff-dto.ts` | `src/lib/staff-dto.ts` |
| `src/lib/validation.ts` | `src/lib/validation.ts` |
| `src/middleware.ts` | `src/middleware.ts` |
| `tailwind.config.ts` | `tailwind.config.ts` |
| `tsconfig.json` | `tsconfig.json` |

## Замененные импорты

| Было | Стало |
| --- | --- |
| `@/actions/auth` | `@/actions/actions-auth` |
| `@/actions/menu` | `@/actions/actions-menu` |
| `@/actions/orders` | `@/actions/actions-orders` |
| `@/lib/auth` | `@/lib/lib-auth` |
| `@/lib/menu` | `@/lib/lib-menu` |
| `@/lib/orders` | `@/lib/lib-orders` |
