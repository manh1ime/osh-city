import { redirect } from "next/navigation";
import { ManagerShell } from "@/components/manager/ManagerShell";
import { getSession } from "@/lib/auth";
import { canAccessManager, roleLabel } from "@/lib/permissions";
import { getRestaurant } from "@/lib/restaurant";

export const dynamic = "force-dynamic";

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession("manager");

  // Страница /manager/login тоже использует этот layout.
  // Для гостя возвращаем форму входа без защищенной оболочки.
  if (!session) return <>{children}</>;
  if (!canAccessManager(session.role)) redirect("/staff/orders");

  const restaurant = await getRestaurant();

  return (
    <ManagerShell
      restaurantName={restaurant.name}
      userName={session.name}
      role={session.role}
      roleLabel={roleLabel[session.role]}
      isOrderingEnabled={restaurant.isOrderingEnabled}
    >
      {children}
    </ManagerShell>
  );
}
