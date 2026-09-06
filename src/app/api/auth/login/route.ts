import bcrypt from "bcryptjs";
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { redirectToPath, safeInternalPath } from "@/lib/http";
import {
  MANAGER_SESSION_COOKIE,
  STAFF_SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSession,
} from "@/lib/session-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Вход сотрудника.
 *
 * Все редиректы относительные: `request.url` на Netlify содержит внутренний
 * адрес деплоя (`<hash>--osh-city-cafe.netlify.app`), а cookie ставится
 * host-only на публичный домен. Абсолютный редирект уводил браузер на другой
 * хост, cookie туда не отправлялась, и первый вход всегда возвращал на форму.
 */
function backToLogin(
  area: "staff" | "manager",
  error: string,
  next?: string | null,
) {
  const base = area === "manager" ? "/manager/login" : "/staff/login";
  const params = new URLSearchParams({ error });
  if (next) params.set("next", next);
  return redirectToPath(`${base}?${params.toString()}`);
}

function cookieValue(name: string, value: string, maxAge: number): string {
  const parts = [
    `${name}=${value}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  return parts.join("; ");
}

export async function POST(request: NextRequest) {
  let area: "staff" | "manager" = "staff";
  let stage = "form";
  let nextPath: string | null = null;

  try {
    const form = await request.formData();
    area = form.get("area") === "manager" ? "manager" : "staff";
    const email = String(form.get("email") ?? "")
      .toLowerCase()
      .trim();
    const password = String(form.get("password") ?? "");
    const rawNext = form.get("next");
    nextPath = typeof rawNext === "string" && rawNext ? rawNext : null;

    if (!email || !password) {
      return backToLogin(area, "Введите email и пароль", nextPath);
    }

    stage = "database";
    const user = await prisma.staffUser.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return backToLogin(area, "Неверный email или пароль", nextPath);
    }

    stage = "password";
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return backToLogin(area, "Неверный email или пароль", nextPath);
    }
    if (area === "manager" && user.role !== "MANAGER") {
      return backToLogin(area, "Нет доступа в панель менеджера", nextPath);
    }
    if (area === "staff" && user.role === "MANAGER") {
      return backToLogin(
        area,
        "Менеджер входит через панель менеджера",
        nextPath,
      );
    }

    stage = "session";
    const token = await signSession({
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
    });

    stage = "response";
    const fallback = area === "manager" ? "/manager" : "/staff/orders";
    const destination = safeInternalPath(nextPath, fallback);
    const sessionCookie = area === "manager"
      ? MANAGER_SESSION_COOKIE
      : STAFF_SESSION_COOKIE;
    const oppositeCookie = area === "manager"
      ? STAFF_SESSION_COOKIE
      : MANAGER_SESSION_COOKIE;

    const response = redirectToPath(destination);
    // Браузер не должен держать активную сессию сразу двух панелей.
    response.headers.append(
      "Set-Cookie",
      cookieValue(sessionCookie, token, SESSION_TTL_SECONDS),
    );
    response.headers.append("Set-Cookie", cookieValue(oppositeCookie, "", 0));

    // Отметку о входе пишем после подготовки ответа: сбой аудита
    // не должен мешать сотруднику начать смену.
    try {
      await prisma.staffUser.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } catch (error) {
      console.error("LOGIN_LAST_LOGIN_UPDATE_FAILED", error);
    }

    return response;
  } catch (error) {
    console.error(`LOGIN_ROUTE_ERROR stage=${stage}`, error);
    return backToLogin(area, `Ошибка входа на этапе: ${stage}`, nextPath);
  }
}
