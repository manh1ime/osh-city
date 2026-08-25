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
    <div>
      <h1 className="font-display text-3xl text-ink-900">Сводка</h1>
      <p className="mt-1 text-sm text-ink-500">
        {restaurant.name}
        {restaurant.address ? ` · ${restaurant.address}` : ""}
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              {stat.label}
            </p>
            <p className="mt-2 font-display text-2xl text-ink-900">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Последние заказы</h2>
            <Link
              href="/manager/orders"
              className="text-xs font-semibold text-wine-600"
            >
              Все заказы
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-head">
                  <th className="py-2 text-left">№</th>
                  <th className="py-2 text-left">Стол</th>
                  <th className="py-2 text-left">Время</th>
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
                    <td className="py-2.5 text-ink-500">
                      {formatTime(order.createdAt)}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`badge ${statusBadgeClass[order.status]}`}
                      >
                        {staffStatusLabel[order.status]}
                      </span>
                    </td>
                    <td className="py-2.5 text-right">
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

        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="font-display text-xl">Популярные блюда</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {popularRaw.map((row) => (
                <li
                  key={row.nameSnapshot}
                  className="flex items-center justify-between"
                >
                  <span className="text-ink-700">{row.nameSnapshot}</span>
                  <span className="text-ink-400">{row._sum.quantity ?? 0}</span>
                </li>
              ))}
              {popularRaw.length === 0 ? (
                <li className="text-ink-400">Нет данных</li>
              ) : null}
            </ul>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">Стоп-лист</h2>
              <Link
                href="/manager/menu"
                className="text-xs font-semibold text-wine-600"
              >
                Меню
              </Link>
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              {stopListed.map((item) => (
                <li key={item.id} className="text-ink-700">
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
