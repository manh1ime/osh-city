import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPushConfigured } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Подписка устройства сотрудника на Web Push.
 *
 * Ключи выдаёт сам браузер через PushManager.subscribe(): сервер их только
 * хранит, чтобы позже зашифровать сообщение для конкретного устройства.
 */
const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(16).max(200),
    auth: z.string().min(8).max(100),
  }),
});

/** Менеджер и персонал держат разные cookie: проверяем обе области. */
async function currentSession() {
  return (await getSession("staff")) ?? (await getSession("manager"));
}

export async function POST(request: NextRequest) {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }
  if (!isPushConfigured()) {
    return NextResponse.json(
      { ok: false, error: "PUSH_NOT_CONFIGURED" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Некорректный запрос" },
      { status: 400 },
    );
  }

  const parsed = subscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Некорректная подписка" },
      { status: 400 },
    );
  }

  const userAgent = request.headers.get("user-agent")?.slice(0, 300) ?? null;

  try {
    // Один endpoint = одно устройство. Повторная подписка после смены
    // сотрудника должна переехать на нового владельца, а не создать дубль.
    await prisma.pushDevice.upsert({
      where: { endpoint: parsed.data.endpoint },
      create: {
        restaurantId: session.restaurantId,
        userId: session.userId,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent,
      },
      update: {
        restaurantId: session.restaurantId,
        userId: session.userId,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        userAgent,
        failureCount: 0,
        lastUsedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("PUSH_SUBSCRIBE_FAILED", error);
    return NextResponse.json(
      { ok: false, error: "Не удалось сохранить подписку" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

/** Отписка устройства: сотрудник выключил уведомления или сдал телефон. */
export async function DELETE(request: NextRequest) {
  const session = await currentSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Некорректный запрос" },
      { status: 400 },
    );
  }

  const endpoint = (body as { endpoint?: unknown }).endpoint;
  if (typeof endpoint !== "string" || !endpoint) {
    return NextResponse.json(
      { ok: false, error: "Не указано устройство" },
      { status: 400 },
    );
  }

  // Удаляем только своё устройство: чужую подписку отключить нельзя.
  await prisma.pushDevice
    .deleteMany({ where: { endpoint, userId: session.userId } })
    .catch((error) => console.error("PUSH_UNSUBSCRIBE_FAILED", error));

  return NextResponse.json({ ok: true });
}
