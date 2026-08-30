import Link from "next/link";
import { OrderStatusLive } from "@/components/guest/OrderStatusLive";
import { prisma } from "@/lib/db";
import { formatMoney, formatTime } from "@/lib/format";
import { getRestaurant } from "@/lib/restaurant";

export const dynamic = "force-dynamic";

export default async function GuestOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const restaurant = await getRestaurant();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, table: true },
  });

  if (!order || order.restaurantId !== restaurant.id) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-ink-900 px-6 text-center">
        <h1 className="font-display text-3xl text-white">Заказ не найден</h1>
        <p className="mt-3 max-w-sm text-sm text-cream-200/70">
          Пожалуйста, обратитесь к персоналу: они проверят заказ в системе.
        </p>
      </main>
    );
  }

  return (
    <main className="guest-theme min-h-screen bg-[#121514] px-4 pb-16 pt-10">
      <div className="mx-auto max-w-lg">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-wine-600/10 text-2xl text-wine-600">
            ✓
          </div>
          <h1 className="mt-4 font-display text-3xl text-ink-900">
            Заказ отправлен
          </h1>
          <p className="mt-2 text-sm text-ink-500">
            Официант подтвердит заказ перед передачей на кухню.
          </p>
        </div>

        <div className="card mt-7 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                Заказ
              </p>
              <p className="font-display text-2xl">№ {order.orderNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                Стол
              </p>
              <p className="font-display text-2xl">{order.table.number}</p>
            </div>
          </div>

          <OrderStatusLive orderId={order.id} initialStatus={order.status} />

          <div className="mt-5 border-t border-cream-200 pt-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              Состав заказа · {formatTime(order.createdAt)}
            </p>
            <ul className="space-y-3">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink-900">
                      {item.nameSnapshot} × {item.quantity}
                    </p>
                    {item.comment ? (
                      <p className="mt-0.5 text-xs italic text-ink-500">
                        {item.comment}
                      </p>
                    ) : null}
                  </div>
                  <span className="whitespace-nowrap text-ink-700">
                    {formatMoney(item.totalPrice, restaurant.currency)}
                  </span>
                </li>
              ))}
            </ul>

            {order.guestComment ? (
              <p className="mt-4 rounded-xl bg-cream-100 px-4 py-3 text-[13px] text-ink-700">
                <span className="font-semibold">Комментарий: </span>
                {order.guestComment}
              </p>
            ) : null}

            <div className="mt-4 flex items-center justify-between border-t border-cream-200 pt-4">
              <span className="text-sm text-ink-500">Итого</span>
              <span className="font-display text-2xl">
                {formatMoney(order.totalAmount, restaurant.currency)}
              </span>
            </div>
          </div>
        </div>

        <Link
          href={`/menu/${order.table.token}`}
          className="btn-ghost mt-6 w-full"
        >
          Вернуться в меню
        </Link>
        <p className="mt-4 text-center text-[11px] text-ink-400">
          {restaurant.name}
          {restaurant.address ? ` · ${restaurant.address}` : ""}
        </p>
      </div>
    </main>
  );
}
