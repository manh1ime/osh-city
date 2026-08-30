import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { GuestMenu } from "@/components/guest/GuestMenu";
import { prisma } from "@/lib/db";
import { parseBadges } from "@/lib/format";
import { getGuestMenu } from "@/lib/menu";
import { getRestaurant } from "@/lib/restaurant";
import {
  formatReservationDate,
  formatReservationTime,
} from "@/lib/reservations";
import { GUEST_PHONE_COOKIE } from "@/lib/session-token";

export const dynamic = "force-dynamic";

export default async function ReservationMenuPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const restaurant = await getRestaurant();
  const store = await cookies();
  const phone = store.get(GUEST_PHONE_COOKIE)?.value;
  if (!phone) redirect("/my-reservations");

  const reservation = await prisma.reservation.findFirst({
    where: {
      code: code.toUpperCase(),
      restaurantId: restaurant.id,
      guestPhone: phone,
    },
  });
  if (!reservation) notFound();
  if (
    reservation.reservedAt.getTime() <= Date.now() ||
    !["PENDING", "CONFIRMED"].includes(reservation.status)
  ) {
    redirect(`/reservation/${reservation.code}`);
  }

  const categories = await getGuestMenu(restaurant.id);

  return (
    <GuestMenu
      reservation={{
        code: reservation.code,
        dateLabel: formatReservationDate(reservation.reservedAt),
        timeLabel: formatReservationTime(reservation.reservedAt),
      }}
      restaurant={{
        name: restaurant.name,
        description: restaurant.description,
        coverImageUrl: restaurant.coverImageUrl,
        currency: restaurant.currency,
        isOrderingEnabled: restaurant.isOrderingEnabled,
      }}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        items: category.menuItems.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          ingredients: item.ingredients,
          allergens: item.allergens,
          price: item.price,
          weight: item.weight,
          imageUrl: item.imageUrl,
          badges: parseBadges(item.badges),
          isStopListed: item.isStopListed,
        })),
      }))}
    />
  );
}
