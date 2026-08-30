import { prisma } from "./db";

export type AuditAction =
  | "order.created"
  | "order.accepted"
  | "order.status_changed"
  | "order.canceled"
  | "reservation_preorder.created"
  | "reservation_preorder.status"
  | "menu_item.created"
  | "menu_item.updated"
  | "menu_item.price_changed"
  | "menu_item.stoplist_changed"
  | "menu_item.stop_list_changed"
  | "menu_item.archived"
  | "menu_item.deleted"
  | "reservation.status"
  | "category.created"
  | "category.updated"
  | "category.deleted"
  | "table.created"
  | "table.updated"
  | "table.token_regenerated"
  | "staff.created"
  | "staff.updated"
  | "staff.deactivated"
  | "staff.login"
  | "staff.logout"
  | "settings.updated"
  | "security.settings_updated"
  | "waiter_call.created"
  | "waiter_call.closed"
  | "waiter_call.in_progress"
  | "staff.activated";

export async function writeAudit(input: {
  restaurantId: string;
  userId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        restaurantId: input.restaurantId,
        userId: input.userId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (error) {
    // Логирование не должно ломать бизнес-операцию
    console.error("AuditLog error", error);
  }
}

export async function writeSecurityEvent(input: {
  restaurantId: string;
  tableId?: string | null;
  guestSessionId?: string | null;
  type: string;
  severity?: "info" | "warning" | "critical";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.securityEvent.create({
      data: {
        restaurantId: input.restaurantId,
        tableId: input.tableId ?? null,
        guestSessionId: input.guestSessionId ?? null,
        type: input.type,
        severity: input.severity ?? "warning",
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (error) {
    console.error("SecurityEvent error", error);
  }
}
