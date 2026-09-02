import { GuestActivity } from "@/components/guest/GuestActivity";
import { Logo } from "@/components/brand/Logo";
import { prisma } from "@/lib/db";
import { getRestaurant } from "@/lib/restaurant";

export const dynamic = "force-dynamic";
export default async function GuestActivityPage({
  params,
}: {
  params: Promise<{ tableToken: string }>;
}) {
  const { tableToken } = await params;
  const [restaurant, table] = await Promise.all([
    getRestaurant(),
    prisma.table.findUnique({ where: { token: tableToken } }),
  ]);
  if (!table || table.restaurantId !== restaurant.id || !table.isActive)
    return (
      <main className="guest-theme flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <Logo variant="emblem" className="h-20 w-20" />
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
