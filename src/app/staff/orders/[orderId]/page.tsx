import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime, formatMoney, staffStatusLabel } from "@/lib/format";
import { orderInclude } from "@/lib/orders";
import { getRestaurant } from "@/lib/restaurant";
import { OrderActions } from "@/components/staff/OrderActions";

export const dynamic = "force-dynamic";

export default async function StaffOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const session = await requireStaff();
  const restaurant = await getRestaurant();
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      ...orderInclude,
      statusEvents: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order || order.restaurantId !== session.restaurantId) notFound();

  return (
    <div>
      <Link
        href="/staff/orders"
        className="text-xs font-semibold text-cream-200/60"
      >
        ← К списку заказов
      </Link>

      <div className="mt-4 rounded-2xl border border-[#353a3d] bg-white/[0.04] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-white">
              Заказ № {order.orderNumber}
            </h1>
            <p className="mt-1 text-xs text-cream-200/60">
              Стол {order.table.number}
              {order.table.zone ? ` · ${order.table.zone}` : ""} ·{" "}
              {formatDateTime(order.createdAt)}
            </p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-cream-200">
            {staffStatusLabel[order.status]}
          </span>
        </div>

        <ul className="mt-5 space-y-2 border-t border-[#303638] pt-4 text-sm text-cream-200/85">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3"
            >
              <div>
                <p>
                  <span className="font-semibold text-white">
                    {item.quantity}×
                  </span>{" "}
                  {item.nameSnapshot}
                </p>
                {item.comment ? (
                  <p className="mt-0.5 text-xs italic text-gold-400/90">
                    {item.comment}
                  </p>
                ) : null}
              </div>
              <span className="whitespace-nowrap">
                {formatMoney(item.totalPrice, restaurant.currency)}
              </span>
            </li>
          ))}
        </ul>

        {order.guestComment ? (
          <p className="mt-4 rounded-xl bg-white/5 px-4 py-3 text-xs text-cream-200/80">
            <span className="font-semibold">Комментарий гостя: </span>
            {order.guestComment}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between border-t border-[#303638] pt-4">
          <span className="text-xs text-cream-200/60">
            {order.acceptedBy
              ? `Принял: ${order.acceptedBy.name}`
              : "Не принят"}
          </span>
          <span className="font-display text-xl text-white">
            {formatMoney(order.totalAmount, restaurant.currency)}
          </span>
        </div>

        <OrderActions
          orderId={order.id}
          status={order.status}
          orderNumber={order.orderNumber}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-[#353a3d] bg-white/[0.03] p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-cream-200/50">
          История статусов
        </h2>
        <ol className="mt-3 space-y-2 text-sm text-cream-200/80">
          {order.statusEvents.map((event) => (
            <li
              key={event.id}
              className="flex items-center justify-between gap-3"
            >
              <span>
                {staffStatusLabel[event.status]}
                {event.note ? (
                  <span className="text-cream-200/50"> · {event.note}</span>
                ) : null}
              </span>
              <span className="text-xs text-cream-200/50">
                {formatDateTime(event.createdAt)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
