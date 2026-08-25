import { GuestActivity } from "@/components/guest/GuestActivity";
import { prisma } from "@/lib/db";
import { getRestaurant } from "@/lib/restaurant";

export const dynamic = "force-dynamic";
export default async function GuestActivityPage({
  params,
}: {
  params: { tableToken: string };
}) {
  const [restaurant, table] = await Promise.all([
    getRestaurant(),
    prisma.table.findUnique({ where: { token: params.tableToken } }),
  ]);
  if (!table || table.restaurantId !== restaurant.id || !table.isActive)
    return (
      <main className="guest-theme flex min-h-screen items-center justify-center">
        <p>Стол не найден</p>
      </main>
    );
  return (
    <GuestActivity
      tableToken={table.token}
      tableNumber={table.number}
      restaurantName={restaurant.name}
      currency={restaurant.currency}
    />
  );
}
