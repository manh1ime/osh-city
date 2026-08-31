import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { GUEST_COOKIE } from "@/lib/session-token";

export const dynamic = "force-dynamic";

/** Поллинг статуса заказа для страницы гостя. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const tableToken = request.nextUrl.searchParams.get("tableToken");
  const guestSessionId = request.cookies.get(GUEST_COOKIE)?.value;
  if (!guestSessionId || !tableToken) {
    return NextResponse.json({ ok: false, error: "Заказ не найден" }, { status: 404 });
  }
  const order = await prisma.order.findUnique({
    where: { id: orderId, guestSessionId },
    include: { table: { select: { token: true } } },
  });
  if (!order || order.table.token !== tableToken) {
    return NextResponse.json(
      { ok: false, error: "Заказ не найден" },
      { status: 404 },
    );
  }
  return NextResponse.json({
    ok: true,
    status: order.status,
    updatedAt: order.updatedAt,
  });
}
