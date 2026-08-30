import { cookies } from "next/headers";
import { GuestMenu } from "@/components/guest/GuestMenu";
import { prisma } from "@/lib/db";
import { parseBadges } from "@/lib/format";
import { getGuestMenu } from "@/lib/menu";
import { getRestaurant } from "@/lib/restaurant";
import { GUEST_COOKIE } from "@/lib/session-token";

export const dynamic = "force-dynamic";

function InvalidQrScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-100 px-6 text-center">
      <div className="w-full max-w-sm rounded-2xl border border-cream-200 bg-white p-8">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-cream-100 text-lg font-semibold text-ink-500">
          !
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
          QR-РєРѕРґ РЅРµРґРµР№СЃС‚РІРёС‚РµР»РµРЅ
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-500">
          РћР±СЂР°С‚РёС‚РµСЃСЊ Рє СЃРѕС‚СЂСѓРґРЅРёРєСѓ СЂРµСЃС‚РѕСЂР°РЅР°.
          Р’Р°Рј РїРѕРјРѕРіСѓС‚ РѕС‚РєСЂС‹С‚СЊ РјРµРЅСЋ РёР»Рё РѕР±РЅРѕРІСЏС‚
          QR-РєРѕРґ РЅР° СЃС‚РѕР»Рµ.
        </p>
      </div>
    </main>
  );
}

export default async function GuestMenuPage({
  params,
}: {
  params: Promise<{ tableToken: string }>;
}) {
  const { tableToken } = await params;
  const restaurant = await getRestaurant();
  const table = await prisma.table.findUnique({
    where: { token: tableToken },
  });

  if (!table || table.restaurantId !== restaurant.id || !table.isActive) {
    return <InvalidQrScreen />;
  }

  // guestSessionId РІС‹РґР°РµС‚СЃСЏ middleware Рё РёСЃРїРѕР»СЊР·СѓРµС‚СЃСЏ РґР°Р»СЊС€Рµ РІ API
  (await cookies()).get(GUEST_COOKIE);

  const categories = await getGuestMenu(restaurant.id);

  return (
    <GuestMenu
      tableToken={table.token}
      table={{ number: table.number, zone: table.zone }}
      restaurant={{
        name: restaurant.name,
        description: restaurant.description,
        coverImageUrl: restaurant.coverImageUrl,
        currency: restaurant.currency,
        isOrderingEnabled: restaurant.isOrderingEnabled,
      }}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        items: category.menuItems.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          ingredients: item.ingredients,
          allergens: item.allergens,
          price: item.price,
          weight: item.weight,
          imageUrl: item.imageUrl,
          badges: parseBadges(item.badges),
          isStopListed: item.isStopListed,
        })),
      }))}
    />
  );
}
