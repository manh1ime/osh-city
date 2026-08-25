import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getGuestMenu } from "@/lib/menu";
import { getRestaurant } from "@/lib/restaurant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeError(error: unknown) {
  const value = error as { name?: string; code?: string; message?: string };
  return {
    name: value?.name ?? "UnknownError",
    code: value?.code ?? null,
    message: (value?.message ?? String(error))
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[DATABASE_URL]")
      .slice(0, 700),
  };
}

export async function GET() {
  const result: Record<string, unknown> = {
    ok: false,
    deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  };

  try {
    const session = await getSession("manager");
    result.managerSession = session
      ? { exists: true, role: session.role, userId: session.userId }
      : { exists: false };
  } catch (error) {
    result.managerSessionError = safeError(error);
  }

  try {
    const restaurant = await getRestaurant();
    result.restaurant = {
      ok: true,
      id: restaurant.id,
      slug: restaurant.slug,
      name: restaurant.name,
    };

    try {
      const categories = await getGuestMenu(restaurant.id);
      result.menu = {
        ok: true,
        categories: categories.length,
        items: categories.reduce((sum, category) => sum + category.menuItems.length, 0),
      };
    } catch (error) {
      result.menu = { ok: false, error: safeError(error) };
    }
  } catch (error) {
    result.restaurant = { ok: false, error: safeError(error) };
  }

  result.ok =
    !("managerSessionError" in result) &&
    (result.restaurant as { ok?: boolean } | undefined)?.ok === true &&
    (result.menu as { ok?: boolean } | undefined)?.ok === true;

  return NextResponse.json(result, {
    status: result.ok ? 200 : 500,
    headers: { "Cache-Control": "no-store" },
  });
}
