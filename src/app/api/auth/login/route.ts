import { NextResponse, type NextRequest } from "next/server";
import { loginWithPassword } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function loginUrl(request: NextRequest, area: "staff" | "manager", error: string) {
  const url = new URL(area === "manager" ? "/manager/login" : "/staff/login", request.url);
  url.searchParams.set("error", error);
  return url;
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const area = form.get("area") === "manager" ? "manager" : "staff";
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (!email || !password) {
    return NextResponse.redirect(loginUrl(request, area, "Введите email и пароль"), 303);
  }

  const result = await loginWithPassword(email, password, area);
  if (!result.ok) {
    return NextResponse.redirect(loginUrl(request, area, result.error), 303);
  }

  return NextResponse.redirect(
    new URL(area === "manager" ? "/manager" : "/staff/orders", request.url),
    303,
  );
}
