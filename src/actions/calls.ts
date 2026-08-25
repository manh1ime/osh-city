"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/audit";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { WaiterCallStatus } from "@prisma/client";

export type ActionResult = { ok: boolean; error?: string };

/** Официант берет в работу или закрывает вызов. */
export async function updateWaiterCallAction(
  callId: string,
  nextStatus: WaiterCallStatus,
): Promise<ActionResult> {
  const user = await requireStaff();
  const call = await prisma.waiterCall.findUnique({ where: { id: callId } });
  if (!call || call.restaurantId !== user.restaurantId) {
    return { ok: false, error: "Вызов не найден" };
  }
  if (call.status === "CLOSED") {
    return { ok: false, error: "Вызов уже закрыт" };
  }

  await prisma.waiterCall.update({
    where: { id: callId },
    data: {
      status: nextStatus,
      closedAt: nextStatus === "CLOSED" ? new Date() : null,
      closedByUserId: nextStatus === "CLOSED" ? user.userId : null,
    },
  });

  await writeAudit({
    restaurantId: user.restaurantId,
    userId: user.userId,
    action:
      nextStatus === "CLOSED"
        ? "waiter_call.closed"
        : "waiter_call.in_progress",
    entityType: "WaiterCall",
    entityId: callId,
  });

  revalidatePath("/staff/calls");
  revalidatePath("/staff/orders");
  revalidatePath("/menu/[tableToken]/activity", "page");
  return { ok: true };
}
