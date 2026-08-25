import Link from "next/link";
import { requireManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { getRestaurant } from "@/lib/restaurant";

export const dynamic = "force-dynamic";
const iso = (date: Date) => date.toISOString().slice(0, 10);
function range(fromRaw?: string, toRaw?: string) {
  const now = new Date();
  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() - 6);
  const from = new Date(`${fromRaw || iso(fallback)}T00:00:00`);
  const to = new Date(`${toRaw || iso(now)}T23:59:59.999`);
  return {
    from: Number.isNaN(from.getTime()) ? fallback : from,
    to: Number.isNaN(to.getTime()) ? now : to,
  };
}
const zone = (category: string | undefined) =>
  category?.toLowerCase().includes("напит") ||
  category?.toLowerCase().includes("бар")
    ? "BAR"
    : "KITCHEN";

export default async function ManagerReportsPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string; area?: string };
}) {
  const session = await requireManager("reports");
  const restaurant = await getRestaurant();
  const dates = range(searchParams.from, searchParams.to);
  const area =
    searchParams.area === "BAR" || searchParams.area === "KITCHEN"
      ? searchParams.area
      : "ALL";
  const orders = await prisma.order.findMany({
    where: {
      restaurantId: session.restaurantId,
      completedAt: { gte: dates.from, lte: dates.to },
      status: "COMPLETED",
    },
    include: {
      table: true,
      acceptedBy: { select: { name: true } },
      items: {
        include: {
          menuItem: { include: { category: { select: { name: true } } } },
        },
      },
    },
    orderBy: { completedAt: "desc" },
  });
  const rows = orders
    .map((order) => {
      const items = order.items.filter(
        (item) => area === "ALL" || zone(item.menuItem?.category.name) === area,
      );
      return {
        order,
        items,
        amount: items.reduce((sum, item) => sum + item.totalPrice, 0),
      };
    })
    .filter((row) => row.items.length > 0);
  const revenue = rows.reduce((sum, row) => sum + row.amount, 0);
  const kitchen = orders
    .flatMap((o) => o.items)
    .filter((i) => zone(i.menuItem?.category.name) === "KITCHEN")
    .reduce((s, i) => s + i.totalPrice, 0);
  const bar = orders
    .flatMap((o) => o.items)
    .filter((i) => zone(i.menuItem?.category.name) === "BAR")
    .reduce((s, i) => s + i.totalPrice, 0);
  return (
    <div>
      <h1 className="text-3xl font-semibold text-ink-900">Отчеты</h1>
      <p className="mt-1 text-sm text-ink-500">
        Выручка, заказы кухни и бара за выбранный период
      </p>
      <form className="card mt-5 grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
        <div>
          <label className="label">С даты</label>
          <input
            className="input"
            type="date"
            name="from"
            defaultValue={iso(dates.from)}
          />
        </div>
        <div>
          <label className="label">По дату</label>
          <input
            className="input"
            type="date"
            name="to"
            defaultValue={iso(dates.to)}
          />
        </div>
        <div>
          <label className="label">Подразделение</label>
          <select className="input" name="area" defaultValue={area}>
            <option value="ALL">Все</option>
            <option value="KITCHEN">Кухня</option>
            <option value="BAR">Бар</option>
          </select>
        </div>
        <div className="col-span-2 flex items-end sm:col-span-1">
          <button className="btn btn-primary w-full">Показать</button>
        </div>
      </form>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Заказов", String(rows.length)],
          ["Выручка", formatMoney(revenue, restaurant.currency)],
          ["Кухня", formatMoney(kitchen, restaurant.currency)],
          ["Бар", formatMoney(bar, restaurant.currency)],
        ].map(([label, value]) => (
          <div className="card p-5" key={label}>
            <p className="text-xs text-ink-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-ink-900">{value}</p>
          </div>
        ))}
      </div>
      <div className="card mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="table-head">
              <th className="p-3">Заказ</th>
              <th>Дата</th>
              <th>Стол</th>
              <th>Официант</th>
              <th>Состав</th>
              <th className="pr-3 text-right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ order, items, amount }) => (
              <tr key={order.id} className="border-t border-cream-200">
                <td className="p-3">
                  <Link
                    className="font-semibold"
                    href={`/manager/orders?order=${order.id}`}
                  >
                    {order.orderNumber}
                  </Link>
                </td>
                <td>{formatDateTime(order.createdAt)}</td>
                <td>{order.table.number}</td>
                <td>{order.acceptedBy?.name ?? "Не назначен"}</td>
                <td>
                  {items
                    .map((i) => `${i.quantity}× ${i.nameSnapshot}`)
                    .join(", ")}
                </td>
                <td className="pr-3 text-right font-semibold">
                  {formatMoney(amount, restaurant.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="p-8 text-center text-ink-400">
            За выбранный период данных нет
          </p>
        ) : null}
      </div>
      <p className="mt-3 text-xs text-ink-400">
        Сейчас к бару относятся категории с названием «Напитки» или «Бар».
        Остальные позиции относятся к кухне.
      </p>
    </div>
  );
}
