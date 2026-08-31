import { OrdersBoard } from "@/components/staff/OrdersBoard";
import { requireStaff } from "@/lib/auth";
import { getStaffFeed } from "@/lib/orders";
import { getRestaurant } from "@/lib/restaurant";
import { prisma } from "@/lib/db";
import { toStaffCallDto, toStaffOrderDto } from "@/lib/staff-dto";

export const dynamic = "force-dynamic";

export default async function StaffOrdersPage() {
  const session = await requireStaff();
  const restaurant = await getRestaurant();
  const staff = await prisma.staffUser.findUnique({
    where: { id: session.userId },
    select: { branchId: true },
  });
  const feed = await getStaffFeed(
    session.restaurantId,
    session.role === "MANAGER" ? null : staff?.branchId ?? "__no_branch__",
  );

  return (
    <OrdersBoard
      currency={restaurant.currency}
      initialOrders={feed.orders.map(toStaffOrderDto)}
      initialCalls={feed.calls.map(toStaffCallDto)}
    />
  );
}
