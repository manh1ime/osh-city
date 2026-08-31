import "server-only";
import type { StaffCall, StaffOrder } from "./orders";
import type {
  StaffCallDto,
  StaffOrderDto,
} from "@/components/staff/OrdersBoard";

/** Prisma -> DTO для клиентской панели персонала (только нужные поля). */
export function toStaffOrderDto(order: StaffOrder): StaffOrderDto {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: order.totalAmount,
    guestComment: order.guestComment,
    createdAt: order.createdAt.toISOString(),
    tableNumber: order.table.number,
    tableZone: order.table.zone,
    branchName: order.table.branch?.name ?? "Филиал не задан",
    acceptedByName: order.acceptedBy?.name ?? null,
    items: order.items.map((item) => ({
      id: item.id,
      nameSnapshot: item.nameSnapshot,
      quantity: item.quantity,
      comment: item.comment,
      totalPrice: item.totalPrice,
    })),
  };
}

export function toStaffCallDto(call: StaffCall): StaffCallDto {
  return {
    id: call.id,
    status: call.status,
    type: call.type,
    message: call.message,
    createdAt: call.createdAt.toISOString(),
    tableNumber: call.table.number,
    tableZone: call.table.zone,
  };
}
