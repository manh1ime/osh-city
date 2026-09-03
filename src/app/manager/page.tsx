import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatMoney,
  formatTime,
  staffStatusLabel,
  statusBadgeClass,
} from "@/lib/format";
import { getRestaurant } from "@/lib/restaurant";

export const dynamic = "force-dynamic";

export default async function ManagerDashboardPage() {
  const session = await requireManager("dashboard");
  const restaurant = await getRestaurant();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todayOrders, notAccepted, stopListed, recentOrders, popularRaw] =
    await Promise.all([
      prisma.order.findMany({
        where: {
          restaurantId: session.restaurantId,
          createdAt: { gte: startOfDay },
          status: { not: "CANCELED" },
        },
        select: { totalAmount: true },
      }),
      prisma.order.count({
        where: { restaurantId: session.restaurantId, status: "NEW" },
      }),
      prisma.menuItem.findMany({
        where: { restaurantId: session.restaurantId, isStopListed: true },
        select: { id: true, name: true },
        take: 20,
      }),
      prisma.order.findMany({
        where: { restaurantId: session.restaurantId },
        include: { table: true },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      prisma.orderItem.groupBy({
        by: ["nameSnapshot"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 6,
      }),
    ]);

  const revenue = todayOrders.reduce(
    (sum, order) => sum + order.totalAmount,
    0,
  );
  const averageCheck =
    todayOrders.length > 0 ? Math.round(revenue / todayOrders.length) : 0;

  const stats = [
    { label: "Заказы сегодня", value: String(todayOrders.length) },
    {
      label: "Сумма заказов",
      value: formatMoney(revenue, restaurant.currency),
    },
    {
      label: "Средний чек",
      value: formatMoney(averageCheck, restaurant.currency),
    },
    { label: "Непринятые заказы", value: String(notAccepted) },
  ];

  return (
    <div className="min-w-0">
      <h1 className="font-display text-3xl text-ink-900">Сводка</h1>
      <p className="mt-1 text-sm text-ink-500">
        {restaurant.name}
        {restaurant.address ? ` · ${restaurant.address}` : ""}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card min-w-0 p-4 sm:p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              {stat.label}
            </p>
            <p className="mt-2 break-words font-display text-xl text-ink-900 sm:text-2xl">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid min-w-0 gap-4 lg:grid-cols-3">
        <div className="card min-w-0 p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl">Последние заказы</h2>
            <Link
              href="/manager/orders"
              className="shrink-0 text-xs font-semibold text-wine-600"
            >
              Все заказы
            </Link>
          </div>

          {/*
            На телефоне таблица давала горизонтальный скролл: пять колонок
            не вмещались в 360px. Поэтому до sm показываем карточки,
            а таблицу включаем только начиная с sm.
          */}
          <div className="mt-4 space-y-2 sm:hidden">
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/manager/orders?order=${order.id}`}
                className="block rounded-lg border border-cream-200 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink-900">
                      № {order.orderNumber}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-400">
                      Стол {order.table.number} · {formatTime(order.createdAt)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-ink-900">
                    {formatMoney(order.totalAmount, restaurant.currency)}
                  </p>
                </div>
                <span
                  className={`badge mt-2 ${statusBadgeClass[order.status]}`}
                >
                  {staffStatusLabel[order.status]}
                </span>
              </Link>
            ))}
            {recentOrders.length === 0 ? (
              <p className="py-8 text-center text-sm text-ink-400">
                Заказов пока нет
              </p>
            ) : null}
          </div>

          <div className="mt-4 hidden sm:block">
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="table-head">
                  <th className="py-2 text-left">№</th>
                  <th className="py-2 text-left">Стол</th>
                  <th className="hidden py-2 text-left lg:table-cell">Время</th>
                  <th className="py-2 text-left">Статус</th>
                  <th className="py-2 text-right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-t border-cream-200">
                    <td className="py-2.5">
                      <Link
                        href={`/manager/orders?order=${order.id}`}
                        className="font-medium"
                      >
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-2.5">{order.table.number}</td>
                    <td className="hidden py-2.5 text-ink-500 lg:table-cell">
                      {formatTime(order.createdAt)}
                    </td>
                    <td className="overflow-hidden py-2.5">
                      <span
                        className={`badge ${statusBadgeClass[order.status]}`}
                      >
                        {staffStatusLabel[order.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap py-2.5 text-right">
                      {formatMoney(order.totalAmount, restaurant.currency)}
                    </td>
                  </tr>
                ))}
                {recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-ink-400">
                      Заказов пока нет
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="card min-w-0 p-4 sm:p-5">
            <h2 className="font-display text-xl">Популярные блюда</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {popularRaw.map((row) => (
                <li
                  key={row.nameSnapshot}
                  className="flex items-start justify-between gap-3"
                >
                  <span className="min-w-0 break-words text-ink-700">
                    {row.nameSnapshot}
                  </span>
                  <span className="shrink-0 text-ink-400">
                    {row._sum.quantity ?? 0}
                  </span>
                </li>
              ))}
              {popularRaw.length === 0 ? (
                <li className="text-ink-400">Нет данных</li>
              ) : null}
            </ul>
          </div>

          <div className="card min-w-0 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-xl">Стоп-лист</h2>
              <Link
                href="/manager/menu"
                className="shrink-0 text-xs font-semibold text-wine-600"
              >
                Меню
              </Link>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {stopListed.map((item) => (
                <li key={item.id} className="break-words text-ink-700">
                  {item.name}
                </li>
              ))}
              {stopListed.length === 0 ? (
                <li className="text-ink-400">Стоп-лист пуст</li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
