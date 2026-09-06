import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  formatReservationDate,
  formatReservationTime,
  guestsLabel,
} from "@/lib/reservations";
import {
  ReservationsBoard,
  type StaffReservationDto,
} from "@/components/staff/ReservationsBoard";

export const dynamic = "force-dynamic";

/**
 * Брони столов. Персонал видит брони единственного зала кафе.
 */
export default async function StaffReservationsPage() {
  const session = await requireRole(["WAITER", "SENIOR_WAITER", "MANAGER"]);

  const actor = await prisma.staffUser.findUnique({
    where: { id: session.userId },
    select: { branchId: true },
  });

  const isBranchStaff = session.role !== "MANAGER";

  // Сотрудник без филиала не должен видеть чужие брони.
  const rows =
    isBranchStaff && !actor?.branchId
      ? []
      : await prisma.reservation.findMany({
          where: {
            restaurantId: session.restaurantId,
            ...(isBranchStaff && actor?.branchId
              ? { branchId: actor.branchId }
              : {}),
            reservedAt: {
              gte: new Date(Date.now() - 1000 * 60 * 60 * 6),
            },
          },
          include: {
            assignedTo: { select: { id: true, name: true } },
            preorders: {
              include: { items: { orderBy: { nameSnapshot: "asc" } } },
              orderBy: { createdAt: "asc" },
            },
          },
          orderBy: { reservedAt: "asc" },
          take: 60,
        });

  const reservations: StaffReservationDto[] = rows.map((row) => ({
    id: row.id,
    code: row.code,
    status: row.status,
    guestName: row.guestName,
    guestPhone: row.guestPhone,
    guestsCount: row.guestsCount,
    guestsLabel: guestsLabel(row.guestsCount),
    comment: row.guestComment,
    dateLabel: formatReservationDate(row.reservedAt),
    timeLabel: formatReservationTime(row.reservedAt),
    assignedToName: row.assignedTo?.name ?? null,
    isMine: row.assignedTo?.id === session.userId,
    preorders: row.preorders.map((preorder) => ({
      id: preorder.id,
      preorderNumber: preorder.preorderNumber,
      status: preorder.status,
      timing: preorder.timing,
      totalAmount: preorder.totalAmount,
      comment: preorder.guestComment,
      items: preorder.items.map((item) => ({
        id: item.id,
        name: item.nameSnapshot,
        quantity: item.quantity,
        comment: item.comment,
      })),
    })),
  }));

  const pendingCount = reservations.filter(
    (item) => item.status === "PENDING",
  ).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/45">
            Ош-Сити · Ленинский проспект, 148
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            Бронирования
          </h1>
          <p className="mt-1 text-sm text-white/50">
            Новых заявок: {pendingCount}
          </p>
        </div>
        <Link
          href="/staff/orders"
          className="btn btn-sm border border-white/20 text-white hover:bg-white/10"
        >
          К заказам
        </Link>
      </div>

      <div className="mt-6">
          <ReservationsBoard
            reservations={reservations}
            canManage={session.role !== "WAITER"}
          />
      </div>
    </div>
  );
}
