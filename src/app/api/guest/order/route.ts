import { NextResponse, type NextRequest } from "next/server";
import { createGuestOrder } from "@/lib/orders";
import { pushNewOrder } from "@/lib/push-events";
import { GUEST_COOKIE } from "@/lib/session-token";

export const runtime = "nodejs";
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

  const existingGuestSession = request.cookies.get(GUEST_COOKIE)?.value;
  const guestSessionId = existingGuestSession ?? `gs_${crypto.randomUUID()}`;

  const result = await createGuestOrder(body, {
    guestSessionId,
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

  // Официант должен узнать о заказе, даже если панель закрыта.
  // Ждём отправку: на serverless функция завершается сразу после ответа.
  if (result.orderId) await pushNewOrder(result.orderId);

  const response = NextResponse.json({
    ok: true,
    orderId: result.orderId,
    orderNumber: result.orderNumber,
    totalAmount: result.totalAmount,
  });
  if (!existingGuestSession) {
    response.cookies.set(GUEST_COOKIE, guestSessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}
