import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getRestaurant } from "@/lib/restaurant";
import { Logo } from "@/components/brand/Logo";
import { ReservationCancelButton } from "@/components/guest/ReservationCancelButton";
import { cookies } from "next/headers";
import { GUEST_PHONE_COOKIE } from "@/lib/session-token";
import { normalizeRussianPhone } from "@/lib/validation";
import { preorderStatusLabel, reservationStatusLabel } from "@/lib/format";
import {
  formatReservationDate,
  formatReservationTime,
  guestsLabel,
} from "@/lib/reservations";

export const dynamic = "force-dynamic";

/** Страница брони по короткому коду. Открывается без авторизации. */
export default async function ReservationPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const restaurant = await getRestaurant();
  const guestPhone = normalizeRussianPhone(
    (await cookies()).get(GUEST_PHONE_COOKIE)?.value ?? "",
  );

  const reservation = await prisma.reservation.findFirst({
    where: {
      code: code.toUpperCase(),
      restaurantId: restaurant.id,
      guestPhone: guestPhone ?? "",
    },
    include: {
      branch: true,
      preorders: {
        include: { items: { orderBy: { nameSnapshot: "asc" } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!reservation) notFound();

  const canCancel =
    reservation.reservedAt.getTime() > Date.now() &&
    (reservation.status === "PENDING" || reservation.status === "CONFIRMED");

  return (
    <div className="guest-theme min-h-screen bg-[#121514] px-4 py-12 text-ink-900 sm:px-6">
      <div className="mx-auto max-w-xl">
        <div className="flex items-center gap-3">
          <Logo variant="emblem" className="h-12 w-12" alt="" />
          <Link
            href="/"
            className="text-xs uppercase tracking-[0.16em] text-white/40 transition hover:text-white/70"
          >
            ← {restaurant.name}
          </Link>
        </div>

        <div className="guest-menu-card mt-4 rounded-2xl p-6 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/50">
            {reservationStatusLabel[reservation.status] ?? reservation.status}
          </p>
          <h1 className="guest-display mt-2 text-2xl font-semibold text-white">
            Бронь стола
          </h1>

          <p className="mt-6 text-xs uppercase tracking-[0.16em] text-white/40">
            Код брони
          </p>
          <p className="guest-display text-3xl font-semibold tracking-[0.2em] text-[#E0B472]">
            {reservation.code}
          </p>

          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
              <dt className="text-white/45">Филиал</dt>
              <dd className="text-right text-white/85">
                {reservation.branch.name}
                <br />
                <span className="text-white/55">
                  {reservation.branch.address}
                </span>
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
              <dt className="text-white/45">Когда</dt>
              <dd className="text-right text-white/85">
                {formatReservationDate(reservation.reservedAt)},{" "}
                {formatReservationTime(reservation.reservedAt)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
              <dt className="text-white/45">Гостей</dt>
              <dd className="text-white/85">
                {guestsLabel(reservation.guestsCount)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
              <dt className="text-white/45">Имя</dt>
              <dd className="text-white/85">{reservation.guestName}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
              <dt className="text-white/45">Телефон</dt>
              <dd className="text-white/85">{reservation.guestPhone}</dd>
            </div>
            {reservation.guestComment ? (
              <div className="flex justify-between gap-4 border-t border-white/10 pt-3">
                <dt className="text-white/45">Комментарий</dt>
                <dd className="text-right text-white/85">
                  {reservation.guestComment}
                </dd>
              </div>
            ) : null}
          </dl>

          {canCancel ? (
            <Link
              href={`/reservation/${reservation.code}/menu`}
              className="btn btn-primary mt-6 min-h-11 w-full"
            >
              Заказать блюда заранее
            </Link>
          ) : null}

          {reservation.preorders.length > 0 ? (
            <section id="preorders" className="mt-6 border-t border-white/10 pt-5">
              <h2 className="guest-display text-lg font-semibold text-white">
                Предзаказы
              </h2>
              <div className="mt-3 space-y-3">
                {reservation.preorders.map((preorder) => (
                  <article
                    key={preorder.id}
                    className="rounded-xl bg-white/5 p-4"
                  >
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="font-medium text-white">
                        № {preorder.preorderNumber}
                      </span>
                       <span className="text-[#E0B472]">
                         {preorderStatusLabel[preorder.status] ?? preorder.status}
                       </span>
                    </div>
                    <p className="mt-1 text-xs text-white/50">
                      {preorder.timing === "SERVE_ON_ARRIVAL"
                        ? "Подать сразу после прихода"
                        : "Готовить после посадки"}
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-white/70">
                      {preorder.items.map((item) => (
                        <li key={item.id}>
                          {item.quantity} × {item.nameSnapshot}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          {canCancel ? (
            <ReservationCancelButton code={reservation.code} />
          ) : null}

          <p className="mt-6 text-xs leading-relaxed text-white/40">
            Назовите код брони на входе. Статус этой страницы обновляется после
            подтверждения или отмены брони.
          </p>
        </div>
      </div>
    </div>
  );
}
