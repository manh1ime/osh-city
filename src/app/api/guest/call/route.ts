import { NextResponse, type NextRequest } from "next/server";
import { writeAudit, writeSecurityEvent } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { checkWaiterCallRateLimit } from "@/lib/rate-limit";
import { getRestaurant, getSecuritySettings } from "@/lib/restaurant";
import { GUEST_COOKIE } from "@/lib/session-token";
import { firstZodError, waiterCallSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Гость зовет официанта со своего стола. */
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

  const parsed = waiterCallSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: firstZodError(parsed.error) },
      { status: 400 },
    );
  }

  const existingGuestSession = request.cookies.get(GUEST_COOKIE)?.value;
  const guestSessionId = existingGuestSession ?? `gs_${crypto.randomUUID()}`;
  const restaurant = await getRestaurant();
  const table = await prisma.table.findUnique({
    where: { token: parsed.data.tableToken },
  });

  if (!table || table.restaurantId !== restaurant.id || !table.isActive) {
    await writeSecurityEvent({
      restaurantId: restaurant.id,
      guestSessionId,
      type: "waiter_call.invalid_table_token",
      severity: "critical",
    });
    return NextResponse.json(
      { ok: false, error: "QR-код недействителен" },
      { status: 404 },
    );
  }

  const settings = await getSecuritySettings(restaurant.id);
  const limit = await checkWaiterCallRateLimit({
    restaurantId: restaurant.id,
    tableId: table.id,
    guestSessionId,
    settings,
  });
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: limit.message },
      { status: 429 },
    );
  }

  const call = await prisma.waiterCall.create({
    data: {
      restaurantId: restaurant.id,
      tableId: table.id,
      type: parsed.data.type,
      message: parsed.data.message ?? null,
      guestSessionId,
    },
  });

  await writeAudit({
    restaurantId: restaurant.id,
    action: "waiter_call.created",
    entityType: "WaiterCall",
    entityId: call.id,
    metadata: { table: table.number, type: parsed.data.type },
  });

  const response = NextResponse.json({ ok: true, callId: call.id });
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
