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
 * Брони столов. Старший официант видит только свой филиал,
 * менеджер видит оба филиала.
 */
export default async function StaffReservationsPage() {
  const session = await requireRole(["SENIOR_WAITER", "MANAGER"]);

  const actor = await prisma.staffUser.findUnique({
    where: { id: session.userId },
    select: { branchId: true, branch: { select: { name: true } } },
  });

  const isSenior = session.role === "SENIOR_WAITER";

  // Старший без филиала не должен видеть чужие брони.
  const rows =
    isSenior && !actor?.branchId
      ? []
      : await prisma.reservation.findMany({
          where: {
            restaurantId: session.restaurantId,
            ...(isSenior && actor?.branchId
              ? { branchId: actor.branchId }
              : {}),
            reservedAt: {
              gte: new Date(Date.now() - 1000 * 60 * 60 * 6),
            },
          },
          include: {
            branch: { select: { name: true } },
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
    branchName: row.branch.name,
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
            {isSenior
              ? (actor?.branch?.name ?? "Филиал не задан")
              : "Все филиалы"}
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

      {isSenior && !actor?.branchId ? (
        <p className="mt-6 rounded-lg border border-[#B7833E]/30 bg-[#B7833E]/10 px-4 py-3 text-sm text-[#E0B472]">
          Вам не назначен филиал. Попросите менеджера указать его в карточке
          сотрудника.
        </p>
      ) : null}

      <div className="mt-6">
        <ReservationsBoard reservations={reservations} showBranch={!isSenior} />
      </div>
    </div>
  );
}
