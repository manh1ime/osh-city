import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { GuestMenu } from "@/components/guest/GuestMenu";
import { prisma } from "@/lib/db";
import { getGuestMenu, toGuestMenuDto } from "@/lib/menu";
import { getRestaurant } from "@/lib/restaurant";
import { GUEST_COOKIE } from "@/lib/session-token";

export const dynamic = "force-dynamic";

export default async function GuestMenuPage({
  params,
}: {
  params: Promise<{ tableToken: string }>;
}) {
  const { tableToken } = await params;
  const restaurant = await getRestaurant();
  const table = await prisma.table.findUnique({
    where: { token: tableToken },
    include: { branch: true },
  });

  if (!table || table.restaurantId !== restaurant.id || !table.isActive) {
    notFound();
  }

  // guestSessionId выдается middleware и используется дальше в API.
  (await cookies()).get(GUEST_COOKIE);

  const categories = await getGuestMenu(restaurant.id);

  return (
    <GuestMenu
      tableToken={table.token}
       table={{
         number: table.number,
         zone: table.zone,
         branchName: table.branch?.name ?? "Филиал не задан",
         branchAddress: table.branch?.address ?? null,
       }}
      restaurant={{
        name: restaurant.name,
        description: restaurant.description,
        coverImageUrl: restaurant.coverImageUrl,
        currency: restaurant.currency,
        isOrderingEnabled: restaurant.isOrderingEnabled,
      }}
      categories={toGuestMenuDto(categories)}
    />
  );
}
