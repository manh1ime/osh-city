"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { categorySchema, firstZodError } from "@/lib/validation";

export type ActionResult = { ok: boolean; error?: string };

function revalidateCategories() {
  revalidatePath("/manager/categories");
  revalidatePath("/manager/menu");
  revalidatePath("/menu/[tableToken]", "page");
}

/** Создание / редактирование категории. */
export async function saveCategoryAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole(["MANAGER"]);
  const parsed = categorySchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    isActive:
      formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };
  const input = parsed.data;

  const data = {
    name: input.name,
    description: input.description || null,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  };

  if (input.id) {
    const existing = await prisma.category.findUnique({
      where: { id: input.id },
    });
    if (!existing || existing.restaurantId !== session.restaurantId) {
      return { ok: false, error: "Категория не найдена" };
    }
    await prisma.category.update({ where: { id: input.id }, data });
    await writeAudit({
      restaurantId: session.restaurantId,
      userId: session.userId,
      action: "category.updated",
      entityType: "Category",
      entityId: input.id,
      metadata: { name: input.name, isActive: input.isActive },
    });
  } else {
    const lastCategory = await prisma.category.findFirst({
      where: { restaurantId: session.restaurantId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const created = await prisma.category.create({
      data: {
        ...data,
        sortOrder: (lastCategory?.sortOrder ?? -10) + 10,
        restaurantId: session.restaurantId,
      },
    });
    await writeAudit({
      restaurantId: session.restaurantId,
      userId: session.userId,
      action: "category.created",
      entityType: "Category",
      entityId: created.id,
      metadata: { name: created.name },
    });
  }

  revalidateCategories();
  return { ok: true };
}

export async function toggleCategoryAction(
  categoryId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const session = await requireRole(["MANAGER"]);
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
  });
  if (!category || category.restaurantId !== session.restaurantId) {
    return { ok: false, error: "Категория не найдена" };
  }
  await prisma.category.update({
    where: { id: categoryId },
    data: { isActive },
  });
  await writeAudit({
    restaurantId: session.restaurantId,
    userId: session.userId,
    action: "category.updated",
    entityType: "Category",
    entityId: categoryId,
    metadata: { isActive, name: category.name },
  });
  revalidateCategories();
  return { ok: true };
}

/** Перестановка категории вверх/вниз. */
export async function moveCategoryAction(
  categoryId: string,
  direction: "up" | "down",
): Promise<ActionResult> {
  const session = await requireRole(["MANAGER"]);
  const categories = await prisma.category.findMany({
    where: { restaurantId: session.restaurantId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  const index = categories.findIndex((category) => category.id === categoryId);
  if (index === -1) return { ok: false, error: "Категория не найдена" };

  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= categories.length) return { ok: true };

  const reordered = [...categories];
  const temp = reordered[index]!;
  reordered[index] = reordered[swapIndex]!;
  reordered[swapIndex] = temp;

  await prisma.$transaction(
    reordered.map((category, position) =>
      prisma.category.update({
        where: { id: category.id },
        data: { sortOrder: position * 10 },
      }),
    ),
  );

  revalidateCategories();
  return { ok: true };
}

/** Удаление категории разрешено только если в ней нет блюд. */
export async function deleteCategoryAction(
  categoryId: string,
): Promise<ActionResult> {
  const session = await requireRole(["MANAGER"]);
  const category = await prisma.category.findUnique({
    where: { id: categoryId },
    include: { _count: { select: { menuItems: true } } },
  });
  if (!category || category.restaurantId !== session.restaurantId) {
    return { ok: false, error: "Категория не найдена" };
  }
  if (category._count.menuItems > 0) {
    return {
      ok: false,
      error: "Сначала перенесите или удалите блюда из этой категории",
    };
  }

  await prisma.category.delete({ where: { id: categoryId } });
  await writeAudit({
    restaurantId: session.restaurantId,
    userId: session.userId,
    action: "category.deleted",
    entityType: "Category",
    entityId: categoryId,
    metadata: { name: category.name },
  });

  revalidateCategories();
  return { ok: true };
}
