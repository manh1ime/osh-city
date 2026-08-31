"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { firstZodError, menuItemSchema } from "@/lib/validation";

export type ActionResult = { ok: boolean; error?: string };

function formToObject(formData: FormData): Record<string, unknown> {
  const raw = Object.fromEntries(formData.entries()) as Record<string, unknown>;
  return {
    ...raw,
    isActive:
      formData.get("isActive") === "on" || formData.get("isActive") === "true",
    isStopListed:
      formData.get("isStopListed") === "on" ||
      formData.get("isStopListed") === "true",
  };
}

function revalidateMenu() {
  revalidatePath("/manager/menu");
  revalidatePath("/manager");
  revalidatePath("/", "page");
  revalidatePath("/menu/[tableToken]", "page");
  revalidatePath("/reservation/[code]/menu", "page");
}

/** Создание или обновление блюда (Менеджер/Админ). */
export async function saveMenuItemAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole(["MANAGER"]);
  const parsed = menuItemSchema.safeParse(formToObject(formData));
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };
  const input = parsed.data;

  const category = await prisma.category.findUnique({
    where: { id: input.categoryId },
  });
  if (!category || category.restaurantId !== session.restaurantId) {
    return { ok: false, error: "Категория не найдена" };
  }

  const data = {
    categoryId: input.categoryId,
    name: input.name,
    description: input.description || null,
    ingredients: input.ingredients || null,
    allergens: input.allergens || null,
    price: input.price,
    weight: input.weight || null,
    imageUrl: input.imageUrl ? input.imageUrl : null,
    badges: input.badges || null,
    isActive: input.isActive,
    isStopListed: input.isStopListed,
    sortOrder: input.sortOrder,
  };

  if (input.id) {
    const existing = await prisma.menuItem.findUnique({
      where: { id: input.id },
    });
    if (!existing || existing.restaurantId !== session.restaurantId) {
      return { ok: false, error: "Блюдо не найдено" };
    }
    await prisma.menuItem.update({ where: { id: input.id }, data });

    if (existing.price !== input.price) {
      await writeAudit({
        restaurantId: session.restaurantId,
        userId: session.userId,
        action: "menu_item.price_changed",
        entityType: "MenuItem",
        entityId: input.id,
        metadata: { from: existing.price, to: input.price, name: input.name },
      });
    }
    if (existing.isStopListed !== input.isStopListed) {
      await writeAudit({
        restaurantId: session.restaurantId,
        userId: session.userId,
        action: "menu_item.stop_list_changed",
        entityType: "MenuItem",
        entityId: input.id,
        metadata: { isStopListed: input.isStopListed, name: input.name },
      });
    }
    await writeAudit({
      restaurantId: session.restaurantId,
      userId: session.userId,
      action: "menu_item.updated",
      entityType: "MenuItem",
      entityId: input.id,
      metadata: { name: input.name },
    });
  } else {
    const created = await prisma.menuItem.create({
      data: { ...data, restaurantId: session.restaurantId },
    });
    await writeAudit({
      restaurantId: session.restaurantId,
      userId: session.userId,
      action: "menu_item.created",
      entityType: "MenuItem",
      entityId: created.id,
      metadata: { name: created.name, price: created.price },
    });
  }

  revalidateMenu();
  return { ok: true };
}

/** Быстрые переключатели: скрыть / стоп-лист. */
export async function toggleMenuItemAction(
  menuItemId: string,
  field: "isActive" | "isStopListed",
  value: boolean,
): Promise<ActionResult> {
  const session = await requireRole(["MANAGER"]);
  const item = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
  if (!item || item.restaurantId !== session.restaurantId) {
    return { ok: false, error: "Блюдо не найдено" };
  }

  await prisma.menuItem.update({
    where: { id: menuItemId },
    data: { [field]: value },
  });
  await writeAudit({
    restaurantId: session.restaurantId,
    userId: session.userId,
    action:
      field === "isStopListed"
        ? "menu_item.stop_list_changed"
        : "menu_item.updated",
    entityType: "MenuItem",
    entityId: menuItemId,
    metadata: { field, value, name: item.name },
  });

  revalidateMenu();
  return { ok: true };
}

/** Удаление блюда. Если блюдо уже в заказах: только скрываем (история должна жить). */
export async function deleteMenuItemAction(
  menuItemId: string,
): Promise<ActionResult> {
  const session = await requireRole(["MANAGER"]);
  const item = await prisma.menuItem.findUnique({ where: { id: menuItemId } });
  if (!item || item.restaurantId !== session.restaurantId) {
    return { ok: false, error: "Блюдо не найдено" };
  }

  const usedInOrders = await prisma.orderItem.count({ where: { menuItemId } });
  if (usedInOrders > 0) {
    await prisma.menuItem.update({
      where: { id: menuItemId },
      data: { isActive: false, isStopListed: true },
    });
    await writeAudit({
      restaurantId: session.restaurantId,
      userId: session.userId,
      action: "menu_item.archived",
      entityType: "MenuItem",
      entityId: menuItemId,
      metadata: {
        name: item.name,
        reason: "used_in_orders",
        orders: usedInOrders,
      },
    });
    revalidateMenu();
    return {
      ok: true,
      error:
        "Блюдо участвует в истории заказов, поэтому оно скрыто и переведено в стоп-лист.",
    };
  }

  await prisma.menuItem.delete({ where: { id: menuItemId } });
  await writeAudit({
    restaurantId: session.restaurantId,
    userId: session.userId,
    action: "menu_item.deleted",
    entityType: "MenuItem",
    entityId: menuItemId,
    metadata: { name: item.name },
  });

  revalidateMenu();
  return { ok: true };
}
