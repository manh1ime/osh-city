import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getStaffNotifications } from "@/lib/notifications";
import { getRestaurant } from "@/lib/restaurant";

export const dynamic = "force-dynamic";

/**
 * Лента уведомлений персонала. Поллинг каждые 10 секунд.
 *
 * Менеджер держит отдельный cookie, поэтому проверяем обе области:
 * иначе колокольчик в панели менеджера всегда получал бы 401.
 */
export async function GET() {
  const session =
    (await getSession("staff")) ?? (await getSession("manager"));
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const restaurant = await getRestaurant();
  const payload = await getStaffNotifications({
    restaurantId: session.restaurantId,
    userId: session.userId,
    role: session.role,
    currency: restaurant.currency,
  });

  return NextResponse.json(payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
