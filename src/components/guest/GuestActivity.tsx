"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type OrderStatus =
  "NEW" | "ACCEPTED" | "SENT_TO_KITCHEN" | "COMPLETED" | "CANCELED";
type CallStatus = "NEW" | "IN_PROGRESS" | "CLOSED";
type Activity = {
  orders: Array<{
    id: string;
    orderNumber: string;
    status: OrderStatus;
    totalAmount: number;
    createdAt: string;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      totalPrice: number;
      comment: string | null;
    }>;
  }>;
  calls: Array<{
    id: string;
    type: string;
    status: CallStatus;
    createdAt: string;
  }>;
};
const orderLabels: Record<OrderStatus, string> = {
  NEW: "Ждет подтверждения",
  ACCEPTED: "Принят официантом",
  SENT_TO_KITCHEN: "Готовится",
  COMPLETED: "Выполнен",
  CANCELED: "Отменен",
};
const callLabels: Record<CallStatus, string> = {
  NEW: "Вызов отправлен",
  IN_PROGRESS: "Официант идет к вам",
  CLOSED: "Вызов выполнен",
};
const steps: OrderStatus[] = [
  "NEW",
  "ACCEPTED",
  "SENT_TO_KITCHEN",
  "COMPLETED",
];
const money = (value: number, currency: string) =>
  `${new Intl.NumberFormat("ru-RU").format(value)} ${currency}`;

export function GuestActivity({
  tableToken,
  tableNumber,
  restaurantName,
  currency,
}: {
  tableToken: string;
  tableNumber: number;
  restaurantName: string;
  currency: string;
}) {
  const [data, setData] = useState<Activity>({ orders: [], calls: [] });
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/guest/activity?tableToken=${encodeURIComponent(tableToken)}`,
        { cache: "no-store" },
      );
      const payload = (await response.json()) as { ok: boolean } & Activity;
      if (payload.ok) setData({ orders: payload.orders, calls: payload.calls });
    } finally {
      setLoading(false);
    }
  }, [tableToken]);
  useEffect(() => {
    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => window.clearInterval(timer);
  }, [refresh]);
  const recentCalls = data.calls.slice(0, 4);
  return (
    <main className="guest-theme min-h-screen bg-[#121514] px-4 pb-16 pt-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-ink-400">
              {restaurantName} · стол {tableNumber}
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-ink-900">
              Мои заказы
            </h1>
          </div>
          <Link href={`/menu/${tableToken}`} className="btn-ghost btn-sm">
            Вернуться в меню
          </Link>
        </div>
        <p className="mt-2 text-sm text-ink-500">
          Статусы обновляются автоматически каждые 5 секунд.
        </p>
        {recentCalls.length ? (
          <section className="mt-6 space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-400">
              Вызовы официанта
            </h2>
            {recentCalls.map((call) => (
              <div key={call.id} className="card p-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${call.status === "CLOSED" ? "bg-cream-300" : "animate-pulse bg-emerald-500"}`}
                  />
                  <div>
                    <p className="font-semibold text-ink-900">
                      {callLabels[call.status]}
                    </p>
                    <p className="text-xs text-ink-400">
                      {call.type === "BILL"
                        ? "Просьба принести счет"
                        : "Вызов к столу"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </section>
        ) : null}
        <section className="mt-7 space-y-4">
          {loading ? (
            <p className="card p-6 text-center text-sm text-ink-400">
              Загружаем историю...
            </p>
          ) : null}
          {!loading && data.orders.length === 0 ? (
            <div className="card p-7 text-center">
              <p className="font-semibold text-ink-900">Заказов пока нет</p>
              <p className="mt-1 text-sm text-ink-500">
                Добавьте блюда в корзину и отправьте первый заказ.
              </p>
            </div>
          ) : null}
          {data.orders.map((order) => {
            const index = steps.indexOf(order.status);
            const canceled = order.status === "CANCELED";
            return (
              <article key={order.id} className="card overflow-hidden p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-ink-400">
                      Заказ № {order.orderNumber}
                    </p>
                    <p
                      className={`mt-1 font-semibold ${canceled ? "text-red-400" : "text-ink-900"}`}
                    >
                      {orderLabels[order.status]}
                    </p>
                  </div>
                  <p className="font-semibold text-ink-900">
                    {money(order.totalAmount, currency)}
                  </p>
                </div>
                {!canceled ? (
                  <div className="mt-4 grid grid-cols-4 gap-1.5">
                    {steps.map((step, stepIndex) => (
                      <div key={step}>
                        <div
                          className={`h-1.5 rounded-full ${stepIndex <= index ? "bg-wine-500" : "bg-cream-200"}`}
                        />
                        <p className="mt-1 text-[9px] leading-tight text-ink-400">
                          {orderLabels[step]}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
                <ul className="mt-4 space-y-2 border-t border-cream-200 pt-4">
                  {order.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex justify-between gap-3 text-sm"
                    >
                      <span className="text-ink-700">
                        {item.quantity} × {item.name}
                        {item.comment ? (
                          <small className="block text-ink-400">
                            {item.comment}
                          </small>
                        ) : null}
                      </span>
                      <span className="text-ink-500">
                        {money(item.totalPrice, currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
