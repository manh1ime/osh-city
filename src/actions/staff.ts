"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { hashPassword, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { firstZodError, staffSchema } from "@/lib/validation";

export type ActionResult = { ok: boolean; error?: string };

function revalidateStaff() {
  revalidatePath("/manager/staff");
}

/** Создание / редактирование сотрудника. Только MANAGER. */
export async function saveStaffAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole(["MANAGER"]);
  const parsed = staffSchema.safeParse({
    ...Object.fromEntries(formData.entries()),
    isActive:
      formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!parsed.success) return { ok: false, error: firstZodError(parsed.error) };
  const input = parsed.data;
  const email = input.email.toLowerCase().trim();

  const sameEmail = await prisma.staffUser.findUnique({ where: { email } });
  if (sameEmail && sameEmail.id !== input.id) {
    return { ok: false, error: "Сотрудник с таким email уже есть" };
  }

  if (input.id) {
    const existing = await prisma.staffUser.findUnique({
      where: { id: input.id },
    });
    if (!existing || existing.restaurantId !== session.restaurantId) {
      return { ok: false, error: "Сотрудник не найден" };
    }
    // Себя нельзя разжаловать или отключить: иначе можно потерять доступ к панели менеджера
    if (
      existing.id === session.userId &&
      (input.role !== "MANAGER" || !input.isActive)
    ) {
      return {
        ok: false,
        error: "Нельзя изменить роль или отключить свою учетную запись",
      };
    }

    await prisma.staffUser.update({
      where: { id: input.id },
      data: {
        name: input.name,
        email,
        role: input.role,
        isActive: input.isActive,
        ...(input.password
          ? { passwordHash: await hashPassword(input.password) }
          : {}),
      },
    });

    await writeAudit({
      restaurantId: session.restaurantId,
      userId: session.userId,
      action: "staff.updated",
      entityType: "StaffUser",
      entityId: input.id,
      metadata: {
        name: input.name,
        role: input.role,
        isActive: input.isActive,
        roleChanged: existing.role !== input.role,
        passwordChanged: Boolean(input.password),
      },
    });
    revalidateStaff();
    return { ok: true };
  }

  if (!input.password) {
    return { ok: false, error: "Укажите пароль для нового сотрудника" };
  }

  const created = await prisma.staffUser.create({
    data: {
      restaurantId: session.restaurantId,
      name: input.name,
      email,
      role: input.role,
      isActive: input.isActive,
      passwordHash: await hashPassword(input.password),
    },
  });

  await writeAudit({
    restaurantId: session.restaurantId,
    userId: session.userId,
    action: "staff.created",
    entityType: "StaffUser",
    entityId: created.id,
    metadata: { name: created.name, email: created.email, role: created.role },
  });

  revalidateStaff();
  return { ok: true };
}

/** Активация / деактивация доступа сотрудника. */
export async function toggleStaffAction(
  userId: string,
  isActive: boolean,
): Promise<ActionResult> {
  const session = await requireRole(["MANAGER"]);
  if (userId === session.userId) {
    return { ok: false, error: "Нельзя отключить свою учетную запись" };
  }

  const user = await prisma.staffUser.findUnique({ where: { id: userId } });
  if (!user || user.restaurantId !== session.restaurantId) {
    return { ok: false, error: "Сотрудник не найден" };
  }

  if (!isActive && user.role === "MANAGER") {
    const activeManagers = await prisma.staffUser.count({
      where: {
        restaurantId: session.restaurantId,
        role: "MANAGER",
        isActive: true,
      },
    });
    if (activeManagers <= 1) {
      return {
        ok: false,
        error: "Должен остаться хотя бы один активный менеджер",
      };
    }
  }

  await prisma.staffUser.update({ where: { id: userId }, data: { isActive } });
  await writeAudit({
    restaurantId: session.restaurantId,
    userId: session.userId,
    action: isActive ? "staff.updated" : "staff.deactivated",
    entityType: "StaffUser",
    entityId: userId,
    metadata: { name: user.name, role: user.role, isActive },
  });

  revalidateStaff();
  return { ok: true };
}
