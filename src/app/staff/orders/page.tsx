import { OrdersBoard } from "@/components/staff/OrdersBoard";
import { requireStaff } from "@/lib/auth";
import { getStaffFeed } from "@/lib/orders";
import { getRestaurant } from "@/lib/restaurant";
import { toStaffCallDto, toStaffOrderDto } from "@/lib/staff-dto";

export const dynamic = "force-dynamic";

export default async function StaffOrdersPage() {
  const session = await requireStaff();
  const restaurant = await getRestaurant();
  const feed = await getStaffFeed(session.restaurantId);

  return (
    <OrdersBoard
      currency={restaurant.currency}
      initialOrders={feed.orders.map(toStaffOrderDto)}
      initialCalls={feed.calls.map(toStaffCallDto)}
    />
  );
}
