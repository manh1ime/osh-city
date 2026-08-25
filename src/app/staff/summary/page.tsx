import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatMoney } from "@/lib/format";
import { getRestaurant } from "@/lib/restaurant";

export const dynamic = "force-dynamic";
const iso = (d: Date) => d.toISOString().slice(0, 10);
export default async function StaffSummaryPage({
  searchParams,
}: {
  searchParams: { from?: string; to?: string };
}) {
  const session = await requireStaff();
  const restaurant = await getRestaurant();
  const now = new Date();
  const week = new Date(now);
  week.setDate(week.getDate() - 6);
  const from = new Date(`${searchParams.from || iso(week)}T00:00:00`);
  const to = new Date(`${searchParams.to || iso(now)}T23:59:59.999`);
  const [completed, active] = await Promise.all([
    prisma.order.findMany({
      where: {
        restaurantId: session.restaurantId,
        acceptedByUserId: session.userId,
        status: "COMPLETED",
        completedAt: { gte: from, lte: to },
      },
      include: { table: true },
      orderBy: { completedAt: "desc" },
    }),
    prisma.order.count({
      where: {
        restaurantId: session.restaurantId,
        acceptedByUserId: session.userId,
        status: { in: ["ACCEPTED", "SENT_TO_KITCHEN"] },
      },
    }),
  ]);
  const total = completed.reduce((s, o) => s + o.totalAmount, 0);
  const average = completed.length ? Math.round(total / completed.length) : 0;
  const days = new Map<string, { count: number; total: number }>();
  completed.forEach((o) => {
    const key = iso(o.completedAt ?? o.createdAt);
    const row = days.get(key) ?? { count: 0, total: 0 };
    row.count++;
    row.total += o.totalAmount;
    days.set(key, row);
  });
  return (
    <div>
      <h1 className="text-3xl font-semibold text-ink-900">Моя сводка</h1>
      <p className="mt-1 text-sm text-ink-500">
        Личные завершенные заказы и сумма за период
      </p>
      <form className="card mt-5 grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
        <div>
          <label className="label">С даты</label>
          <input
            className="input"
            type="date"
            name="from"
            defaultValue={iso(from)}
          />
        </div>
        <div>
          <label className="label">По дату</label>
          <input
            className="input"
            type="date"
            name="to"
            defaultValue={iso(to)}
          />
        </div>
        <div className="col-span-2 flex items-end sm:col-span-1">
          <button className="btn btn-primary w-full">Показать</button>
        </div>
      </form>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Выполнено", String(completed.length)],
          ["Сумма заказов", formatMoney(total, restaurant.currency)],
          ["Средний чек", formatMoney(average, restaurant.currency)],
          ["Сейчас в работе", String(active)],
        ].map(([l, v]) => (
          <div key={l} className="card p-5">
            <p className="text-xs text-ink-400">{l}</p>
            <p className="mt-2 text-2xl font-semibold text-ink-900">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-xl font-semibold text-ink-900">По дням</h2>
          <ul className="mt-4 space-y-3">
            {[...days.entries()].map(([day, row]) => (
              <li
                key={day}
                className="flex justify-between border-b border-cream-200 pb-2 text-sm"
              >
                <span>
                  {new Date(day + "T12:00:00").toLocaleDateString("ru-RU")}
                </span>
                <span>
                  {row.count} заказов ·{" "}
                  {formatMoney(row.total, restaurant.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="text-xl font-semibold text-ink-900">
            Последние выполненные
          </h2>
          <ul className="mt-4 space-y-3">
            {completed.slice(0, 12).map((o) => (
              <li key={o.id} className="flex justify-between gap-3 text-sm">
                <Link href={`/staff/orders/${o.id}`} className="font-semibold">
                  № {o.orderNumber} · стол {o.table.number}
                </Link>
                <span className="text-right text-ink-500">
                  {formatMoney(o.totalAmount, restaurant.currency)}
                  <small className="block">
                    {formatDateTime(o.completedAt ?? o.createdAt)}
                  </small>
                </span>
              </li>
            ))}
          </ul>
          {!completed.length ? (
            <p className="text-sm text-ink-400">
              В этом периоде завершенных заказов нет
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-4 text-xs text-ink-400">
        Сводка показывает оборот принятых и завершенных вами заказов. Это
        операционный отчет, а не расчет заработной платы.
      </p>
    </div>
  );
}
