import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatDateTime,
  formatMoney,
  staffStatusLabel,
  statusBadgeClass,
} from "@/lib/format";
import { orderInclude } from "@/lib/orders";
import { getRestaurant } from "@/lib/restaurant";

export const dynamic = "force-dynamic";

const STATUSES: OrderStatus[] = [
  "NEW",
  "ACCEPTED",
  "SENT_TO_KITCHEN",
  "COMPLETED",
  "CANCELED",
];

export default async function ManagerOrdersPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    date?: string;
    table?: string;
    order?: string;
  };
}) {
  const session = await requireManager("orders");
  const restaurant = await getRestaurant();

  const status = STATUSES.includes(searchParams.status as OrderStatus)
    ? (searchParams.status as OrderStatus)
    : undefined;
  const tableId = searchParams.table || undefined;

  let dateFilter: { gte: Date; lt: Date } | undefined;
  if (searchParams.date) {
    const from = new Date(`${searchParams.date}T00:00:00`);
    if (!Number.isNaN(from.getTime())) {
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      dateFilter = { gte: from, lt: to };
    }
  }

  const [orders, tables, selected] = await Promise.all([
    prisma.order.findMany({
      where: {
        restaurantId: session.restaurantId,
        ...(status ? { status } : {}),
        ...(tableId ? { tableId } : {}),
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.table.findMany({
      where: { restaurantId: session.restaurantId },
      orderBy: { number: "asc" },
    }),
    searchParams.order
      ? prisma.order.findFirst({
          where: { id: searchParams.order, restaurantId: session.restaurantId },
          include: {
            ...orderInclude,
            statusEvents: {
              orderBy: { createdAt: "asc" },
            },
          },
        })
      : Promise.resolve(null),
  ]);

  const revenue = orders
    .filter((order) => order.status !== "CANCELED")
    .reduce((sum, order) => sum + order.totalAmount, 0);

  function href(params: Record<string, string | undefined>) {
    const next = new URLSearchParams();
    const merged = {
      status: status,
      date: searchParams.date,
      table: tableId,
      ...params,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }
    const query = next.toString();
    return query ? `/manager/orders?${query}` : "/manager/orders";
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink-900">Заказы</h1>
      <p className="mt-1 text-sm text-ink-500">
        Найдено {orders.length} · сумма{" "}
        {formatMoney(revenue, restaurant.currency)}
      </p>

      <form method="get" className="card mt-5 grid gap-3 p-4 sm:grid-cols-4">
        <div>
          <label className="label" htmlFor="status">
            Статус
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status ?? ""}
            className="input"
          >
            <option value="">Все</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {staffStatusLabel[value]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="date">
            Дата
          </label>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={searchParams.date ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="table">
            Стол
          </label>
          <select
            id="table"
            name="table"
            defaultValue={tableId ?? ""}
            className="input"
          >
            <option value="">Все столы</option>
            {tables.map((table) => (
              <option key={table.id} value={table.id}>
                № {table.number}
                {table.zone ? ` · ${table.zone}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn btn-dark">
            Применить
          </button>
          <Link href="/manager/orders" className="btn btn-ghost">
            Сбросить
          </Link>
        </div>
      </form>

      {selected ? (
        <div className="card mt-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl">
                Заказ {selected.orderNumber}
              </h2>
              <p className="text-sm text-ink-500">
                Стол № {selected.table.number}
                {selected.table.zone ? ` · ${selected.table.zone}` : ""} ·{" "}
                {formatDateTime(selected.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${statusBadgeClass[selected.status]}`}>
                {staffStatusLabel[selected.status]}
              </span>
              <Link
                href={href({ order: undefined })}
                className="btn-ghost btn-sm"
              >
                Закрыть
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Позиции
              </h3>
              <ul className="mt-2 space-y-2 text-sm">
                {selected.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span>
                      {item.quantity} × {item.nameSnapshot}
                      {item.comment ? (
                        <span className="block text-xs text-ink-400">
                          {item.comment}
                        </span>
                      ) : null}
                    </span>
                    <span>
                      {formatMoney(item.totalPrice, restaurant.currency)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex justify-between border-t border-cream-200 pt-3 font-semibold">
                <span>Итог</span>
                <span>
                  {formatMoney(selected.totalAmount, restaurant.currency)}
                </span>
              </p>
              {selected.guestComment ? (
                <p className="mt-3 rounded-xl bg-cream-100 p-3 text-sm text-ink-700">
                  Комментарий гостя: {selected.guestComment}
                </p>
              ) : null}
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                История статусов
              </h3>
              <ul className="mt-2 space-y-2 text-sm">
                {selected.statusEvents.map((event) => (
                  <li key={event.id} className="flex justify-between gap-3">
                    <span>{staffStatusLabel[event.status]}</span>
                    <span className="text-ink-400">
                      {formatDateTime(event.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
              {selected.acceptedBy ? (
                <p className="mt-3 text-sm text-ink-500">
                  Принял: {selected.acceptedBy.name}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className="card mt-5 overflow-x-auto p-1">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="table-head">
              <th className="px-4 py-3 text-left">№</th>
              <th className="px-4 py-3 text-left">Стол</th>
              <th className="hidden px-4 py-3 text-left lg:table-cell">Создан</th>
              <th className="hidden px-4 py-3 text-left md:table-cell">Позиций</th>
              <th className="px-4 py-3 text-left">Статус</th>
              <th className="hidden px-4 py-3 text-left xl:table-cell">Принял</th>
              <th className="px-4 py-3 text-right">Сумма</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-cream-200">
                <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                <td className="px-4 py-3">№ {order.table.number}</td>
                <td className="hidden px-4 py-3 text-ink-500 lg:table-cell">
                  {formatDateTime(order.createdAt)}
                </td>
                <td className="hidden px-4 py-3 md:table-cell">{order.items.length}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${statusBadgeClass[order.status]}`}>
                    {staffStatusLabel[order.status]}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-ink-500 xl:table-cell">
                  {order.acceptedBy?.name ?? "-"}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {formatMoney(order.totalAmount, restaurant.currency)}
                </td>
                <td className="px-2 py-3 text-right sm:px-4">
                  <Link
                    href={href({ order: order.id })}
                    className="text-xs font-semibold text-wine-600"
                  >
                    Подробнее
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-ink-400">
                  Нет заказов по выбранным фильтрам
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
