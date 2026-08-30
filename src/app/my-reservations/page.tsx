import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { getRestaurant } from "@/lib/restaurant";
import {
  formatReservationDate,
  formatReservationTime,
  guestsLabel,
} from "@/lib/reservations";
import { GUEST_PHONE_COOKIE } from "@/lib/session-token";
import {
  MyReservations,
  type GuestReservationDto,
} from "@/components/guest/MyReservations";

export const dynamic = "force-dynamic";

/**
 * «Мои бронирования»: гость узнаётся по телефону из cookie,
 * который ставится при бронировании или вводится вручную.
 */
export default async function MyReservationsPage() {
  const store = await cookies();
  const phone = store.get(GUEST_PHONE_COOKIE)?.value ?? null;
  const restaurant = await getRestaurant();

  const rows = phone
    ? await prisma.reservation.findMany({
        where: { restaurantId: restaurant.id, guestPhone: phone },
        include: {
          branch: { select: { name: true, address: true } },
          assignedTo: { select: { name: true } },
        },
        orderBy: { reservedAt: "desc" },
      })
    : [];

  const now = Date.now();
  const reservations: GuestReservationDto[] = rows.map((row) => ({
    id: row.id,
    code: row.code,
    status: row.status,
    branchName: row.branch.name,
    branchAddress: row.branch.address,
    dateLabel: formatReservationDate(row.reservedAt),
    timeLabel: formatReservationTime(row.reservedAt),
    guestsLabel: guestsLabel(row.guestsCount),
    comment: row.guestComment,
    hostName: row.assignedTo?.name ?? null,
    isPast:
      row.reservedAt.getTime() < now ||
      row.status === "CANCELED" ||
      row.status === "NO_SHOW",
  }));

  return (
    <MyReservations
      restaurantName={restaurant.name}
      phone={phone}
      reservations={reservations}
    />
  );
}
