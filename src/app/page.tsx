import { getRestaurant } from "@/lib/restaurant";
import { getPrimaryBranch } from "@/lib/branches";
import { LandingPage } from "@/components/landing/LandingPage";

/**
 * Публичный лендинг: коротко о кафе и бронирование стола.
 * Филиал ровно один, поэтому выбора филиала на странице нет.
 * Сотрудники по-прежнему входят через /staff/login и /manager/login.
 */
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const restaurant = await getRestaurant();
  const branch = await getPrimaryBranch(restaurant.id);

  return (
    <LandingPage
      restaurant={{
        name: restaurant.name,
        description: restaurant.description,
        coverImageUrl: restaurant.coverImageUrl,
      }}
      branch={branch}
    />
  );
}
