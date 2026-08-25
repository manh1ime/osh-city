import { MenuManager } from "@/components/manager/MenuManager";
import { requireManager } from "@/lib/auth";
import { getManagerMenu } from "@/lib/menu";
import { getRestaurant } from "@/lib/restaurant";

export const dynamic = "force-dynamic";

export default async function ManagerMenuPage() {
  const session = await requireManager("menu");
  const [restaurant, { items, categories }] = await Promise.all([
    getRestaurant(),
    getManagerMenu(session.restaurantId),
  ]);

  return (
    <MenuManager
      currency={restaurant.currency}
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
      }))}
      items={items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        ingredients: item.ingredients,
        allergens: item.allergens,
        price: item.price,
        weight: item.weight,
        imageUrl: item.imageUrl,
        badges: item.badges,
        isActive: item.isActive,
        isStopListed: item.isStopListed,
        sortOrder: item.sortOrder,
        categoryId: item.categoryId,
        categoryName: item.category.name,
      }))}
    />
  );
}
