import { requireManager } from "@/lib/auth";
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
import { reservationStatusLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  date?: string;
};

const STATUSES = ["PENDING", "CONFIRMED", "SEATED", "CANCELED", "NO_SHOW"] as const;

export default async function ManagerReservationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const query = await searchParams;
  const session = await requireManager("reservations");
  const status = STATUSES.includes(query.status as (typeof STATUSES)[number])
    ? (query.status as (typeof STATUSES)[number])
    : undefined;

  let dateFilter: { gte: Date; lt: Date } | undefined;
  if (query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date)) {
    const from = new Date(`${query.date}T00:00:00`);
    if (!Number.isNaN(from.getTime())) {
      const to = new Date(from);
      to.setDate(to.getDate() + 1);
      dateFilter = { gte: from, lt: to };
    }
  }

  const rows = await prisma.reservation.findMany({
    where: {
      restaurantId: session.restaurantId,
      ...(status ? { status } : {}),
      ...(dateFilter ? { reservedAt: dateFilter } : {}),
    },
    include: {
      assignedTo: { select: { id: true, name: true } },
      preorders: {
        include: { items: { orderBy: { nameSnapshot: "asc" } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ createdAt: "desc" }, { reservedAt: "desc" }],
    take: 200,
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

  return (
    <div>
      <h1 className="font-display text-3xl text-ink-900">Бронирования</h1>
      <p className="mt-1 text-sm text-ink-500">Все брони и предзаказы</p>
      <form method="get" className="card mt-5 grid gap-3 p-4 sm:grid-cols-3">
        <select name="status" defaultValue={status ?? ""} className="input" aria-label="Статус">
          <option value="">Все статусы</option>
          {STATUSES.map((value) => <option key={value} value={value}>{reservationStatusLabel[value]}</option>)}
        </select>
        <input name="date" type="date" defaultValue={query.date ?? ""} className="input" aria-label="Дата" />
        <button type="submit" className="btn btn-dark">Применить</button>
      </form>
      <div className="mt-6">
        <ReservationsBoard reservations={reservations} />
      </div>
    </div>
  );
}
