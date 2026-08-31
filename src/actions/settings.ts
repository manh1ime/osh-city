"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRestaurant } from "@/lib/restaurant";
import { firstZodError, settingsSchema } from "@/lib/validation";

export type ActionResult = { ok: boolean; error?: string };

/** Настройки ресторана без изменения закреплённых цвета и валюты. */
export async function saveSettingsAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole(["MANAGER"]);
  const restaurant = await getRestaurant();
  if (restaurant.id !== session.restaurantId) {
    return { ok: false, error: "Ресторан не найден" };
  }

  // Цвет и валюта закреплены в конфигурации «Учкудука» и не принимаются
  // из формы, поэтому их нельзя изменить подменой запроса.
  const parsed = settingsSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    primaryColor: restaurant.primaryColor,
    currency: restaurant.currency,
    isOrderingEnabled:
      formData.get("isOrderingEnabled") === "on" ||
      formData.get("isOrderingEnabled") === "true",
  });
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };
  const input = parsed.data;

  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: {
      name: input.name,
      description: input.description || null,
      address: input.address || null,
      logoUrl: "/images/uchkuduk-logo.webp",
      coverImageUrl: input.coverImageUrl || null,
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
      isOrderingEnabled: input.isOrderingEnabled,
      orderingChanged: restaurant.isOrderingEnabled !== input.isOrderingEnabled,
    },
  });

  revalidatePath("/");
  revalidatePath("/manager/settings");
  revalidatePath("/manager");
  revalidatePath("/staff/orders");
  revalidatePath("/menu/[tableToken]", "page");
  revalidatePath("/reservation/[code]/menu", "page");
  return { ok: true };
}
