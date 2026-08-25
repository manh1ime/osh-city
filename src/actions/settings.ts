"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRestaurant } from "@/lib/restaurant";
import { firstZodError, settingsSchema } from "@/lib/validation";

export type ActionResult = { ok: boolean; error?: string };

/** Настройки ресторана: бренд, валюта, прием заказов. Только MANAGER. */
export async function saveSettingsAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole(["MANAGER"]);
  const parsed = settingsSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    isOrderingEnabled:
      formData.get("isOrderingEnabled") === "on" ||
      formData.get("isOrderingEnabled") === "true",
  });
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };
  const input = parsed.data;

  const restaurant = await getRestaurant();
  if (restaurant.id !== session.restaurantId) {
    return { ok: false, error: "Ресторан не найден" };
  }

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: {
      name: input.name,
      description: input.description || null,
      address: input.address || null,
      logoUrl: input.logoUrl || null,
      coverImageUrl: input.coverImageUrl || null,
      primaryColor: input.primaryColor,
      currency: input.currency,
      isOrderingEnabled: input.isOrderingEnabled,
    },
  });

  await writeAudit({
    restaurantId: restaurant.id,
    userId: session.userId,
    action: "settings.updated",
    entityType: "Restaurant",
    entityId: restaurant.id,
    metadata: {
      name: input.name,
      currency: input.currency,
      primaryColor: input.primaryColor,
      isOrderingEnabled: input.isOrderingEnabled,
      orderingChanged: restaurant.isOrderingEnabled !== input.isOrderingEnabled,
    },
  });

  revalidatePath("/manager/settings");
  revalidatePath("/manager");
  revalidatePath("/staff/orders");
  return { ok: true };
}
