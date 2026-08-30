"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  cancelMyReservationAction,
  forgetGuestPhoneAction,
  lookupReservationsAction,
} from "@/actions/reservations";

export type GuestReservationDto = {
  id: string;
  code: string;
  status: "PENDING" | "CONFIRMED" | "SEATED" | "CANCELED" | "NO_SHOW";
  branchName: string;
  branchAddress: string;
  dateLabel: string;
  timeLabel: string;
  guestsLabel: string;
  comment: string | null;
  hostName: string | null;
  isPast: boolean;
};

const STATUS_LABEL: Record<GuestReservationDto["status"], string> = {
  PENDING: "Ожидает подтверждения",
  CONFIRMED: "Подтверждена",
  SEATED: "Гости за столом",
  CANCELED: "Отменена",
  NO_SHOW: "Гости не пришли",
};

const STATUS_COLOR: Record<GuestReservationDto["status"], string> = {
  PENDING: "text-[#E0B472]",
  CONFIRMED: "text-emerald-300",
  SEATED: "text-emerald-200",
  CANCELED: "text-white/40",
  NO_SHOW: "text-white/40",
};

type Props = {
  restaurantName: string;
  phone: string | null;
  reservations: GuestReservationDto[];
};

/** Гостевой раздел «Мои бронирования»: без регистрации, по номеру телефона. */
export function MyReservations({ restaurantName, phone, reservations }: Props) {
  const router = useRouter();
  const [inputPhone, setInputPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runLookup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData();
    formData.set("phone", inputPhone);
    startTransition(async () => {
      const result = await lookupReservationsAction(formData);
      if (!result.ok) {
        setError(result.error ?? "Не удалось найти брони");
        return;
      }
      setInputPhone("");
      router.refresh();
    });
  }

  function cancel(code: string) {
    setError(null);
    startTransition(async () => {
      const result = await cancelMyReservationAction(code);
      if (!result.ok) {
        setError(result.error ?? "Не удалось отменить бронь");
        return;
      }
      router.refresh();
    });
  }

  function forget() {
    startTransition(async () => {
      await forgetGuestPhoneAction();
      router.refresh();
    });
  }

  const upcoming = reservations.filter((item) => !item.isPast);
  const past = reservations.filter((item) => item.isPast);

  return (
    <div className="guest-theme min-h-screen bg-[#121514] px-4 py-10 text-ink-900 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.16em] text-white/40 transition hover:text-white/70"
        >
          {restaurantName}
        </Link>
        <h1 className="guest-display mt-3 text-3xl font-semibold tracking-[-0.03em] text-white">
          Мои бронирования
        </h1>

        {phone ? (
          <p className="mt-2 text-sm text-white/55">
            Номер {phone}
            <button
              type="button"
              onClick={forget}
              disabled={isPending}
              className="ml-3 text-xs uppercase tracking-[0.16em] text-white/40 underline transition hover:text-white/70"
            >
              Сменить номер
            </button>
          </p>
        ) : (
          <p className="mt-2 text-sm text-white/55">
            Укажите номер телефона, на который оформляли бронь.
          </p>
        )}

        {!phone ? (
          <form
            onSubmit={runLookup}
            className="guest-menu-card mt-6 rounded-2xl p-5"
          >
            <label className="label text-white/70" htmlFor="lookup-phone">
              Телефон
            </label>
            <input
              id="lookup-phone"
              className="input"
              inputMode="tel"
              maxLength={20}
              placeholder="+7 900 000-00-00"
              value={inputPhone}
              onChange={(event) => setInputPhone(event.target.value)}
            />
            <button
              type="submit"
              disabled={isPending}
              className="btn btn-primary mt-4 min-h-11 w-full"
            >
              {isPending ? "Ищем..." : "Показать брони"}
            </button>
          </form>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        {phone && reservations.length === 0 ? (
          <div className="guest-menu-card mt-6 rounded-2xl p-6 text-center">
            <p className="text-sm text-white/60">
              На этот номер броней пока нет.
            </p>
            <Link href="/#booking" className="btn btn-primary mt-4 min-h-11">
              Забронировать стол
            </Link>
          </div>
        ) : null}

        {upcoming.length > 0 ? (
          <section className="mt-6 space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/50">
              Ближайшие
            </p>
            {upcoming.map((item) => (
              <ReservationCard
                key={item.id}
                reservation={item}
                onCancel={cancel}
                disabled={isPending}
              />
            ))}
          </section>
        ) : null}

        {past.length > 0 ? (
          <section className="mt-8 space-y-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/40">
              Архив
            </p>
            {past.map((item) => (
              <ReservationCard key={item.id} reservation={item} disabled />
            ))}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function ReservationCard({
  reservation,
  onCancel,
  disabled,
}: {
  reservation: GuestReservationDto;
  onCancel?: (code: string) => void;
  disabled?: boolean;
}) {
  const canCancel =
    !reservation.isPast &&
    reservation.status !== "CANCELED" &&
    reservation.status !== "SEATED" &&
    reservation.status !== "NO_SHOW";

  return (
    <article className="guest-menu-card rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className={`text-xs font-medium uppercase tracking-[0.16em] ${
              STATUS_COLOR[reservation.status]
            }`}
          >
            {STATUS_LABEL[reservation.status]}
          </p>
          <h2 className="guest-display mt-1 text-lg font-semibold text-white">
            {reservation.branchName}
          </h2>
          <p className="text-sm text-white/55">{reservation.branchAddress}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.16em] text-white/40">
            Код
          </p>
          <p className="guest-display text-xl font-semibold tracking-[0.2em] text-[#E0B472]">
            {reservation.code}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-white/75">
        {reservation.dateLabel} в {reservation.timeLabel} ·{" "}
        {reservation.guestsLabel}
      </p>
      {reservation.hostName ? (
        <p className="mt-1 text-sm text-white/50">
          Вас встретит {reservation.hostName}
        </p>
      ) : null}
      {reservation.comment ? (
        <p className="mt-2 text-sm text-white/45">{reservation.comment}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        {canCancel ? (
          <Link
            href={`/reservation/${reservation.code}/menu`}
            className="btn btn-primary btn-sm"
          >
            Заказать блюда
          </Link>
        ) : null}
        <Link
          href={`/reservation/${reservation.code}`}
          className="btn btn-sm border border-white/20 text-white hover:bg-white/10"
        >
          Подробнее
        </Link>
        {canCancel && onCancel ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onCancel(reservation.code)}
            className="btn btn-sm border border-red-400/30 text-red-200 hover:bg-red-400/10"
          >
            Отменить
          </button>
        ) : null}
      </div>
    </article>
  );
}
