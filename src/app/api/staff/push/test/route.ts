import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isPushConfigured, sendPushToUsers } from "@/lib/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Тестовый push самому себе.
 *
 * Позволяет сотруднику проверить всю цепочку на своём телефоне, не дожидаясь
 * реального заказа: подписка -> сервис Google/Apple -> service worker -> экран.
 */
export async function POST() {
  const session =
    (await getSession("staff")) ?? (await getSession("manager"));
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }
  if (!isPushConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "На сервере не заданы ключи VAPID. Уведомления будут работать только в открытой панели.",
      },
      { status: 503 },
    );
  }

  const devices = await prisma.pushDevice.count({
    where: { userId: session.userId },
  });
  if (devices === 0) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Это устройство не подписано. Нажмите «Включить уведомления» и разрешите их в браузере.",
      },
      { status: 400 },
    );
  }

  const result = await sendPushToUsers([session.userId], {
    title: "Проверка уведомлений",
    body: `${session.name}, звук и вибрация работают. Реальные события придут так же.`,
    url: "/staff/notifications",
    // Уникальный tag: тест не должен заменять уведомление о настоящем заказе.
    tag: `test:${Date.now()}`,
    urgency: "high",
  });

  return NextResponse.json({
    ok: result.sent > 0,
    devices,
    ...result,
    error:
      result.sent === 0
        ? "Push не доставлен. Проверьте разрешение уведомлений в настройках браузера."
        : undefined,
  });
}
