import { NextResponse, type NextRequest } from "next/server";
import { redirectToPath } from "@/lib/http";
import {
  GUEST_COOKIE,
  MANAGER_SESSION_COOKIE,
  STAFF_SESSION_COOKIE,
  verifySession,
} from "@/lib/session-token";

/** Защита панелей персонала и менеджера, плюс анонимная гостевая сессия. */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-uchkuduk-pathname", pathname);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (pathname === "/menu" || pathname.startsWith("/menu/") || pathname.startsWith("/order")) {
    if (!request.cookies.get(GUEST_COOKIE)?.value) {
      response.cookies.set(GUEST_COOKIE, `gs_${crypto.randomUUID()}`, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return response;
  }

  const isStaffArea = pathname.startsWith("/staff");
  const isManagerArea = pathname.startsWith("/manager");
  if (!isStaffArea && !isManagerArea) return response;

  const isLoginPage =
    pathname === "/staff/login" || pathname === "/manager/login";
  const cookieName = isManagerArea
    ? MANAGER_SESSION_COOKIE
    : STAFF_SESSION_COOKIE;
  const session = await verifySession(request.cookies.get(cookieName)?.value);

  // Всегда показываем страницу входа. Это предотвращает цикл 307,
  // если cookie существует, но серверная проверка сессии больше не проходит.
  if (isLoginPage) return response;

  // Редиректы строго относительные: на Netlify `request.url` содержит
  // внутренний адрес деплоя, и абсолютный Location уводил браузер на другой
  // хост, где host-only cookie сессии уже не отправляется.
  if (!session) {
    const search = new URLSearchParams({ next: pathname }).toString();
    const loginPath = isManagerArea ? "/manager/login" : "/staff/login";
    return redirectToPath(`${loginPath}?${search}`, 307);
  }

  if (isManagerArea && session.role !== "MANAGER") {
    return redirectToPath("/staff/orders", 307);
  }

  return response;
}

export const config = {
  matcher: ["/staff/:path*", "/manager/:path*", "/menu/:path*", "/order/:path*"],
};
