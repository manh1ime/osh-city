import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStaffFeed } from "@/lib/orders";
import { toStaffCallDto, toStaffOrderDto } from "@/lib/staff-dto";
import { prisma } from "@/lib/db";

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
  const staff = await prisma.staffUser.findUnique({
    where: { id: session.userId },
    select: { branchId: true },
  });
  const feed = await getStaffFeed(
    session.restaurantId,
    session.role === "MANAGER" ? null : staff?.branchId ?? "__no_branch__",
  );
  return NextResponse.json({
    ok: true,
    orders: feed.orders.map(toStaffOrderDto),
    calls: feed.calls.map(toStaffCallDto),
    serverTime: feed.serverTime,
  });
}
