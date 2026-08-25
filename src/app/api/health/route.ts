import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function databaseHost() {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname || null;
  } catch {
    return "INVALID_URL";
  }
}

function safeError(error: unknown) {
  const value = error as { name?: string; code?: string; message?: string };
  return {
    name: value?.name ?? "UnknownError",
    code: value?.code ?? null,
    message: (value?.message ?? String(error))
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[DATABASE_URL]")
      .slice(0, 500),
  };
}

export async function GET() {
  const diagnostics = {
    deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    databaseHost: databaseHost(),
    authSecretConfigured: (process.env.AUTH_SECRET?.length ?? 0) >= 16,
    hashSaltConfigured: Boolean(process.env.HASH_SALT),
    restaurantSlug: process.env.RESTAURANT_SLUG ?? null,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? null,
  };

  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    const [restaurants, tables, categories, menuItems] = await Promise.all([
      prisma.restaurant.count(),
      prisma.table.count(),
      prisma.category.count(),
      prisma.menuItem.count(),
    ]);

    return NextResponse.json({
      ok: true,
      ...diagnostics,
      counts: { restaurants, tables, categories, menuItems },
    });
  } catch (error) {
    console.error("HEALTHCHECK_DATABASE_ERROR", error);
    return NextResponse.json(
      { ok: false, ...diagnostics, error: safeError(error) },
      { status: 500 },
    );
  }
}
