import bcrypt from "bcryptjs";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  MANAGER_SESSION_COOKIE,
  STAFF_SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  signSession,
} from "@/lib/session-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function backToLogin(request: NextRequest, area: "staff" | "manager", error: string) {
  const url = new URL(area === "manager" ? "/manager/login" : "/staff/login", request.url);
  url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  let area: "staff" | "manager" = "staff";
  let stage = "form";

  try {
    const form = await request.formData();
    area = form.get("area") === "manager" ? "manager" : "staff";
    const email = String(form.get("email") ?? "").toLowerCase().trim();
    const password = String(form.get("password") ?? "");

    if (!email || !password) return backToLogin(request, area, "Введите email и пароль");

    stage = "database";
    const user = await prisma.staffUser.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      return backToLogin(request, area, "Неверный email или пароль");
    }

    stage = "password";
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return backToLogin(request, area, "Неверный email или пароль");
    }
    if (area === "manager" && user.role !== "MANAGER") {
      return backToLogin(request, area, "Нет доступа в панель менеджера");
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
    const response = NextResponse.redirect(
      new URL(area === "manager" ? "/manager" : "/staff/orders", request.url),
      303,
    );
    response.cookies.set(
      area === "manager" ? MANAGER_SESSION_COOKIE : STAFF_SESSION_COOKIE,
      token,
      {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: SESSION_TTL_SECONDS,
      },
    );
    return response;
  } catch (error) {
    console.error(`LOGIN_ROUTE_ERROR stage=${stage}`, error);
    return backToLogin(request, area, `Ошибка входа на этапе: ${stage}`);
  }
}
