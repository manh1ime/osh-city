import { CategoryManager } from "@/components/manager/CategoryManager";
import { requireManager } from "@/lib/auth";
import { getManagerMenu } from "@/lib/menu";

export const dynamic = "force-dynamic";

export default async function ManagerCategoriesPage() {
  const session = await requireManager("categories");
  const { categories } = await getManagerMenu(session.restaurantId);

  return (
    <CategoryManager
      categories={categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        sortOrder: category.sortOrder,
        isActive: category.isActive,
        itemsCount: category._count.menuItems,
      }))}
    />
  );
}
