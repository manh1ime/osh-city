"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { setReservationStatusAction } from "@/actions/reservations";
import { setReservationPreorderStatusAction } from "@/actions/reservations";
import { preorderStatusLabel } from "@/lib/format";

export type StaffReservationDto = {
  id: string;
  code: string;
  status: "PENDING" | "CONFIRMED" | "SEATED" | "CANCELED" | "NO_SHOW";
  branchName: string;
  guestName: string;
  guestPhone: string;
  guestsCount: number;
  guestsLabel: string;
  comment: string | null;
  dateLabel: string;
  timeLabel: string;
  assignedToName: string | null;
  isMine: boolean;
  preorders: Array<{
    id: string;
    preorderNumber: string;
    status: "NEW" | "CONFIRMED" | "IN_KITCHEN" | "READY" | "CANCELED";
    timing: "SERVE_ON_ARRIVAL" | "PREPARE_AFTER_SEATING";
    totalAmount: number;
    comment: string | null;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      comment: string | null;
    }>;
  }>;
};

const STATUS_LABEL: Record<StaffReservationDto["status"], string> = {
  PENDING: "Новая",
  CONFIRMED: "Подтверждена",
  SEATED: "Гости за столом",
  CANCELED: "Отменена",
  NO_SHOW: "Не пришли",
};

const STATUS_BADGE: Record<StaffReservationDto["status"], string> = {
  PENDING: "bg-[#B7833E]/20 text-[#E0B472]",
  CONFIRMED: "bg-emerald-500/15 text-emerald-300",
  SEATED: "bg-emerald-500/25 text-emerald-200",
  CANCELED: "bg-white/10 text-white/45",
  NO_SHOW: "bg-white/10 text-white/45",
};

/** Доска броней для старшего официанта и менеджера. */
export function ReservationsBoard({
  reservations,
  showBranch,
  canManage = true,
}: {
  reservations: StaffReservationDto[];
  showBranch: boolean;
  canManage?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Гостевая отмена должна появляться у персонала без ручной перезагрузки.
  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [router]);

  function setStatus(id: string, status: StaffReservationDto["status"]) {
    setError(null);
    const formData = new FormData();
    formData.set("reservationId", id);
    formData.set("status", status);
    startTransition(async () => {
      const result = await setReservationStatusAction(formData);
      if (!result.ok) {
        setError(result.error ?? "Не удалось обновить бронь");
        return;
      }
      router.refresh();
    });
  }

  function setPreorderStatus(
    id: string,
    status: "CONFIRMED" | "IN_KITCHEN" | "READY" | "CANCELED",
  ) {
    setError(null);
    startTransition(async () => {
      const result = await setReservationPreorderStatusAction(id, status);
      if (!result.ok) setError(result.error ?? "Не удалось обновить предзаказ");
      router.refresh();
    });
  }

  if (reservations.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/55">
        Броней пока нет.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {reservations.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border border-white/10 bg-white/5 p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <span className={`badge ${STATUS_BADGE[item.status]}`}>
                {STATUS_LABEL[item.status]}
              </span>
              <h2 className="mt-2 text-lg font-semibold text-white">
                {item.guestName}
              </h2>
              <p className="text-sm text-white/55">
                <a
                  href={`tel:${item.guestPhone}`}
                  className="underline decoration-white/20 underline-offset-4"
                >
                  {item.guestPhone}
                </a>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.16em] text-white/40">
                Код
              </p>
              <p className="text-lg font-semibold tracking-[0.2em] text-[#E0B472]">
                {item.code}
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm text-white/75">
            {item.dateLabel} в {item.timeLabel} · {item.guestsLabel}
            {showBranch ? ` · ${item.branchName}` : ""}
          </p>
          <p className="mt-1 text-sm text-white/45">
            {item.assignedToName
              ? `Ответственный: ${item.assignedToName}${
                  item.isMine ? " (вы)" : ""
                }`
              : "Ответственный не назначен"}
          </p>
          {item.comment ? (
            <p className="mt-2 rounded-lg bg-white/5 px-3 py-2 text-sm text-white/60">
              {item.comment}
            </p>
          ) : null}

          {item.preorders.map((preorder) => (
            <section
              key={preorder.id}
              className="mt-4 rounded-xl border border-[#B7833E]/25 bg-[#B7833E]/10 p-4"
            >
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.14em] text-[#E0B472]">
                    Предзаказ № {preorder.preorderNumber}
                  </p>
                  <p className="mt-1 text-sm text-white/65">
                    {preorder.timing === "SERVE_ON_ARRIVAL"
                      ? "Приготовить заранее и подать после посадки"
                      : "Начать готовить после посадки гостей"}
                  </p>
                </div>
                <strong className="text-sm text-white">
                  {preorderStatusLabel[preorder.status]}
                </strong>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-white/80">
                {preorder.items.map((line) => (
                  <li key={line.id}>
                    {line.quantity} × {line.name}
                    {line.comment ? ` · ${line.comment}` : ""}
                  </li>
                ))}
              </ul>
              {canManage ? <div className="mt-3 flex flex-wrap gap-2">
                {preorder.status === "NEW" ? (
                  <button
                    disabled={isPending}
                    onClick={() => setPreorderStatus(preorder.id, "CONFIRMED")}
                    className="btn btn-primary btn-sm"
                  >
                    Принять
                  </button>
                ) : null}
                {preorder.status === "CONFIRMED" ? (
                  <button
                    disabled={isPending}
                    onClick={() => setPreorderStatus(preorder.id, "IN_KITCHEN")}
                    className="btn btn-primary btn-sm"
                  >
                    На кухню
                  </button>
                ) : null}
                {preorder.status === "IN_KITCHEN" ? (
                  <button
                    disabled={isPending}
                    onClick={() => setPreorderStatus(preorder.id, "READY")}
                    className="btn btn-primary btn-sm"
                  >
                    Готово
                  </button>
                ) : null}
                {preorder.status === "NEW" ||
                preorder.status === "CONFIRMED" ? (
                  <button
                    disabled={isPending}
                    onClick={() => setPreorderStatus(preorder.id, "CANCELED")}
                    className="btn btn-sm border border-red-400/30 text-red-200"
                  >
                    Отменить
                  </button>
                ) : null}
              </div> : null}
            </section>
          ))}

          {canManage ? <div className="mt-4 flex flex-wrap gap-2">
            {item.status !== "CONFIRMED" && item.status !== "SEATED" ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => setStatus(item.id, "CONFIRMED")}
                className="btn btn-primary btn-sm"
              >
                Подтвердить
              </button>
            ) : null}
            {item.status !== "SEATED" ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => setStatus(item.id, "SEATED")}
                className="btn btn-sm border border-white/20 text-white hover:bg-white/10"
              >
                Гости за столом
              </button>
            ) : null}
            {item.status !== "NO_SHOW" ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => setStatus(item.id, "NO_SHOW")}
                className="btn btn-sm border border-white/20 text-white/70 hover:bg-white/10"
              >
                Не пришли
              </button>
            ) : null}
            {item.status !== "CANCELED" ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => setStatus(item.id, "CANCELED")}
                className="btn btn-sm border border-red-400/30 text-red-200 hover:bg-red-400/10"
              >
                Отменить
              </button>
            ) : null}
          </div> : null}
        </article>
      ))}
    </div>
  );
}
