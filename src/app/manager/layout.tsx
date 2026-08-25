import { redirect } from "next/navigation";
import { ManagerShell } from "@/components/manager/ManagerShell";
import { getSession } from "@/lib/auth";
import { getRestaurant } from "@/lib/restaurant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession("manager");

  // Экран входа должен быть доступен без оболочки менеджера.
  if (!session) return <>{children}</>;
  if (session.role !== "MANAGER") redirect("/staff/orders");

  const restaurant = await getRestaurant();

  return (
    <ManagerShell
      restaurantName={restaurant.name}
      userName={session.name}
      roleLabel="Менеджер"
      role="MANAGER"
      isOrderingEnabled={restaurant.isOrderingEnabled}
    >
      {children}
    </ManagerShell>
  );
}
