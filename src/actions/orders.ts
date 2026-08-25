"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { changeOrderStatus } from "@/lib/orders";
import type { OrderStatus } from "@prisma/client";

export type ActionResult = { ok: boolean; error?: string };

/** Официант меняет статус заказа (переходы проверяются на сервере). */
export async function changeOrderStatusAction(
  orderId: string,
  nextStatus: OrderStatus,
): Promise<ActionResult> {
  const user = await requireStaff();
  const result = await changeOrderStatus({ orderId, nextStatus, user });
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath("/staff/orders");
  revalidatePath(`/staff/orders/${orderId}`);
  revalidatePath("/manager/orders");
  revalidatePath("/manager");
  revalidatePath("/manager/reports");
  revalidatePath("/staff/summary");
  revalidatePath("/menu/[tableToken]/activity", "page");
  return { ok: true };
}
