import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { GUEST_COOKIE } from "@/lib/session-token";
import { getRestaurant } from "@/lib/restaurant";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guestSessionId = request.cookies.get(GUEST_COOKIE)?.value;
  const tableToken = request.nextUrl.searchParams.get("tableToken");
  if (!guestSessionId || !tableToken) {
    return NextResponse.json({ ok: true, orders: [], calls: [] });
  }
  const restaurant = await getRestaurant();
  const table = await prisma.table.findUnique({ where: { token: tableToken } });
  if (!table || table.restaurantId !== restaurant.id || !table.isActive) {
    return NextResponse.json(
      { ok: false, error: "Стол не найден" },
      { status: 404 },
    );
  }
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
  const [orders, calls] = await Promise.all([
    prisma.order.findMany({
      where: { tableId: table.id, guestSessionId, createdAt: { gte: since } },
      include: { items: { orderBy: { nameSnapshot: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.waiterCall.findMany({
      where: { tableId: table.id, guestSessionId, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  return NextResponse.json({
    ok: true,
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.nameSnapshot,
        quantity: item.quantity,
        totalPrice: item.totalPrice,
        comment: item.comment,
      })),
    })),
    calls: calls.map((call) => ({
      id: call.id,
      type: call.type,
      status: call.status,
      createdAt: call.createdAt,
    })),
  });
}
