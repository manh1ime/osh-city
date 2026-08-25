import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStaffFeed } from "@/lib/orders";
import { toStaffCallDto, toStaffOrderDto } from "@/lib/staff-dto";

export const dynamic = "force-dynamic";

/** Поллинг для панели персонала (каждые 3-5 секунд). */
export async function GET() {
  const session = await getSession("staff");
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }
  const feed = await getStaffFeed(session.restaurantId);
  return NextResponse.json({
    ok: true,
    orders: feed.orders.map(toStaffOrderDto),
    calls: feed.calls.map(toStaffCallDto),
    serverTime: feed.serverTime,
  });
}
