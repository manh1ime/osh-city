"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateTableToken } from "@/lib/hash";
import { getSecuritySettings } from "@/lib/restaurant";
import { firstZodError, tableSchema } from "@/lib/validation";

export type ActionResult = { ok: boolean; error?: string; token?: string };

function revalidateTables() {
  revalidatePath("/manager/tables");
}

/** Создание / редактирование стола. */
export async function saveTableAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole(["MANAGER"]);
  const parsed = tableSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    isActive:
      formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };
  const input = parsed.data;
  const settings = await getSecuritySettings(session.restaurantId);

  if (input.id) {
    const existing = await prisma.table.findUnique({ where: { id: input.id } });
    if (!existing || existing.restaurantId !== session.restaurantId) {
      return { ok: false, error: "Стол не найден" };
    }
    await prisma.table.update({
      where: { id: input.id },
      data: {
        number: input.number,
        zone: input.zone || null,
        isActive: input.isActive,
      },
    });
    await writeAudit({
      restaurantId: session.restaurantId,
      userId: session.userId,
      action: "table.updated",
      entityType: "Table",
      entityId: input.id,
      metadata: {
        number: input.number,
        zone: input.zone,
        isActive: input.isActive,
      },
    });
    revalidateTables();
    return { ok: true };
  }

  const duplicate = await prisma.table.findFirst({
    where: { restaurantId: session.restaurantId, number: input.number },
  });
  if (duplicate)
    return { ok: false, error: `Стол № ${input.number} уже существует` };

  const created = await prisma.table.create({
    data: {
      restaurantId: session.restaurantId,
      number: input.number,
      zone: input.zone || null,
      isActive: input.isActive,
      token: generateTableToken(input.number, settings.qrTokenLength),
    },
  });
  await writeAudit({
    restaurantId: session.restaurantId,
    userId: session.userId,
    action: "table.created",
    entityType: "Table",
    entityId: created.id,
    metadata: { number: created.number, zone: created.zone },
  });

  revalidateTables();
  return { ok: true, token: created.token };
}

/**
 * Перегенерация QR-токена: старая ссылка сразу перестает работать.
 */
export async function regenerateTableTokenAction(
  tableId: string,
): Promise<ActionResult> {
  const session = await requireRole(["MANAGER"]);
  const table = await prisma.table.findUnique({ where: { id: tableId } });
  if (!table || table.restaurantId !== session.restaurantId) {
    return { ok: false, error: "Стол не найден" };
  }
  const settings = await getSecuritySettings(session.restaurantId);
  const token = generateTableToken(table.number, settings.qrTokenLength);

  await prisma.table.update({ where: { id: tableId }, data: { token } });
  await writeAudit({
    restaurantId: session.restaurantId,
    userId: session.userId,
    action: "table.token_regenerated",
    entityType: "Table",
    entityId: tableId,
    metadata: { number: table.number, oldTokenTail: table.token.slice(-4) },
  });

  revalidateTables();
  return { ok: true, token };
}

export async function toggleTableAction(
  tableId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const session = await requireRole(["MANAGER"]);
  const table = await prisma.table.findUnique({ where: { id: tableId } });
  if (!table || table.restaurantId !== session.restaurantId) {
    return { ok: false, error: "Стол не найден" };
  }
  await prisma.table.update({ where: { id: tableId }, data: { isActive } });
  await writeAudit({
    restaurantId: session.restaurantId,
    userId: session.userId,
    action: "table.updated",
    entityType: "Table",
    entityId: tableId,
    metadata: { number: table.number, isActive },
  });
  revalidateTables();
  return { ok: true };
}
