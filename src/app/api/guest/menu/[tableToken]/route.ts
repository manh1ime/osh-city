import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getGuestMenu, toGuestMenuDto } from "@/lib/menu";
import { getRestaurant } from "@/lib/restaurant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tableToken: string }> },
) {
  try {
    const { tableToken } = await params;
    const restaurant = await getRestaurant();
    const table = await prisma.table.findUnique({
      where: { token: tableToken },
      include: { branch: true },
    });
    if (!table || table.restaurantId !== restaurant.id || !table.isActive) {
      return NextResponse.json(
        { ok: false, error: "QR-код недействителен" },
        { status: 404 },
      );
    }
    const categories = await getGuestMenu(restaurant.id);
    return NextResponse.json({
      ok: true,
      restaurant: {
        name: restaurant.name,
        description: restaurant.description,
        logoUrl: "/images/uchkuduk-logo.webp",
        coverImageUrl: restaurant.coverImageUrl,
        currency: restaurant.currency,
        isOrderingEnabled: restaurant.isOrderingEnabled,
      },
      table: {
        number: table.number,
        zone: table.zone,
        branchName: table.branch?.name ?? "Филиал не задан",
        branchAddress: table.branch?.address ?? null,
      },
      categories: toGuestMenuDto(categories),
    });
  } catch (error) {
    console.error("GUEST_MENU_API_ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Не удалось загрузить меню" },
      { status: 500 },
    );
  }
}
