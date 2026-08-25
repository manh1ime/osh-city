import { NextResponse, type NextRequest } from "next/server";
import { createGuestOrder } from "@/lib/orders";
import { GUEST_COOKIE } from "@/lib/session-token";

export const dynamic = "force-dynamic";

function clientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip");
}

/** Гостевое создание заказа. Цены из тела запроса игнорируются. */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Некорректный запрос" },
      { status: 400 },
    );
  }

  const result = await createGuestOrder(body, {
    guestSessionId: request.cookies.get(GUEST_COOKIE)?.value ?? null,
    ip: clientIp(request),
    userAgent: request.headers.get("user-agent"),
  });

  if (!result.ok) {
    const status =
      result.code === "RATE_LIMITED"
        ? 429
        : result.code === "INVALID_TOKEN"
          ? 404
          : 400;
    return NextResponse.json({ ok: false, error: result.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    totalAmount: result.totalAmount,
  });
}
