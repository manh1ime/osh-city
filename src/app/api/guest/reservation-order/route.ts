import { NextResponse, type NextRequest } from "next/server";
import { createReservationPreorder } from "@/lib/preorders";
import { pushNewPreorder } from "@/lib/push-events";
import { GUEST_PHONE_COOKIE } from "@/lib/session-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const phone = request.cookies.get(GUEST_PHONE_COOKIE)?.value ?? null;
  const result = await createReservationPreorder(body, phone);
  // Предзаказ требует подготовки кухни: сообщаем старшему официанту сразу.
  if (result.ok) await pushNewPreorder(result.preorderId);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
