import { getRestaurant } from "@/lib/restaurant";
import { getActiveBranches } from "@/lib/branches";
import { LandingPage } from "@/components/landing/LandingPage";

/**
 * Публичный лендинг: коротко о кафе, выбор филиала и бронирование стола.
 * Сотрудники по-прежнему входят через /staff/login и /manager/login.
 */
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const restaurant = await getRestaurant();
  const branches = await getActiveBranches(restaurant.id);

  return (
    <LandingPage
      restaurant={{
        name: restaurant.name,
        description: restaurant.description,
        coverImageUrl: restaurant.coverImageUrl,
      }}
      branches={branches}
    />
  );
}
