import type { Metadata } from "next";
import { GuestMenu } from "@/components/guest/GuestMenu";
import { getPublicMenuDto } from "@/lib/menu";
import { getRestaurant } from "@/lib/restaurant";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const restaurant = await getRestaurant();
  return {
    title: `Меню — ${restaurant.name}`,
    description:
      restaurant.description ??
      `Меню ресторана ${restaurant.name}: состав блюд, вес и цены.`,
  };
}

/**
 * Гостевое меню: все блюда из меню менеджера доступны только для просмотра.
 * Заказ, корзина и вызов официанта здесь недоступны — они работают
 * на странице стола по QR-коду или в предзаказе к брони.
 */
export default async function PublicMenuPage() {
  const restaurant = await getRestaurant();
  const categories = await getPublicMenuDto(restaurant.id);

  return (
    <GuestMenu
      viewOnly
      restaurant={{
        name: restaurant.name,
        description: restaurant.description,
        logoUrl: "/images/uchkuduk-logo.webp",
        coverImageUrl: restaurant.coverImageUrl,
        currency: restaurant.currency,
        isOrderingEnabled: restaurant.isOrderingEnabled,
      }}
      categories={categories}
    />
  );
}
