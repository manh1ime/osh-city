import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Поллинг статуса заказа для страницы гостя. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await params;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, status: true, updatedAt: true },
  });
  if (!order) {
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
