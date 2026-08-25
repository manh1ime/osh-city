import { NextResponse, type NextRequest } from "next/server";
import {
  GUEST_COOKIE,
  MANAGER_SESSION_COOKIE,
  STAFF_SESSION_COOKIE,
  verifySession,
} from "@/lib/session-token";

/** Защита панелей персонала и менеджера, плюс анонимная гостевая сессия. */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  if (pathname.startsWith("/menu") || pathname.startsWith("/order")) {
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

  if (!session) {
    const loginUrl = new URL(
      isManagerArea ? "/manager/login" : "/staff/login",
      request.url,
    );
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isManagerArea && session.role !== "MANAGER") {
    return NextResponse.redirect(new URL("/staff/orders", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/menu/:path*",
    "/order/:path*",
    "/staff/:path*",
    "/manager/:path*",
  ],
};
