import { cookies } from "next/headers";
import { GuestMenu } from "@/components/guest/GuestMenu";
import { prisma } from "@/lib/db";
import { getGuestMenu, toGuestMenuDto } from "@/lib/menu";
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
          QR-код недействителен
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-500">
          Обратитесь к сотруднику ресторана. Вам помогут открыть меню или обновят QR-код на столе.
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
    include: { branch: true },
  });

  if (!table || table.restaurantId !== restaurant.id || !table.isActive) {
    return <InvalidQrScreen />;
  }

  // guestSessionId выдается middleware и используется дальше в API.
  (await cookies()).get(GUEST_COOKIE);

  const categories = await getGuestMenu(restaurant.id);

  return (
    <GuestMenu
      tableToken={table.token}
       table={{
         number: table.number,
         zone: table.zone,
         branchName: table.branch?.name ?? "Филиал не задан",
         branchAddress: table.branch?.address ?? null,
       }}
      restaurant={{
        name: restaurant.name,
        description: restaurant.description,
        logoUrl: "/images/uchkuduk-logo.webp",
        coverImageUrl: restaurant.coverImageUrl,
        currency: restaurant.currency,
        isOrderingEnabled: restaurant.isOrderingEnabled,
      }}
      categories={toGuestMenuDto(categories)}
    />
  );
}
