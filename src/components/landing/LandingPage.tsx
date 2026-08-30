"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createReservationAction } from "@/actions/reservations";
import type { BranchDto } from "@/lib/branches";
import {
  RESERVATION_LIMITS,
  combineDateAndTime,
  formatReservationDate,
  guestsLabel,
  workingHoursLabel,
} from "@/lib/reservations";

type RestaurantDto = {
  name: string;
  description: string | null;
  coverImageUrl: string | null;
};

type Props = {
  restaurant: RestaurantDto;
  branches: BranchDto[];
};

/** Дата в формате input[type=date]: "2026-09-01". */
function toIsoDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const HIGHLIGHTS = [
  {
    title: "Восточная кухня",
    text: "Плов, лагман, манты и шашлык на живом угле. Каждый день свежая готовка.",
  },
  {
    title: "Залы на 12 столов",
    text: "В каждом филиале 12 столов по 4 места. Для большой компании сдвинем столы.",
  },
  {
    title: "Меню в телефоне",
    text: "QR-код на столе: состав блюд, вес и заказ без ожидания официанта.",
  },
];

export function LandingPage({ restaurant, branches }: Props) {
  // Границы календаря считаем один раз: сегодня и потолок бронирования.
  const today = useMemo(() => toIsoDate(new Date()), []);
  const maxDate = useMemo(() => {
    const limit = new Date();
    limit.setDate(limit.getDate() + RESERVATION_LIMITS.maxDaysAhead);
    return toIsoDate(limit);
  }, []);

  const [branchSlug, setBranchSlug] = useState(branches[0]?.slug ?? "");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("19:00");
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [activeReservationCode, setActiveReservationCode] = useState<
    string | null
  >(null);
  const [isPending, setIsPending] = useState(false);

  // После успешного бронирования оставляем быстрый доступ к брони в шапке.
  // localStorage нужен, чтобы кнопка не исчезала после обновления страницы.
  useEffect(() => {
    setActiveReservationCode(localStorage.getItem("activeReservationCode"));
  }, []);

  const branch = useMemo(
    () => branches.find((item) => item.slug === branchSlug) ?? branches[0],
    [branches, branchSlug],
  );

  const dateLabel = useMemo(() => {
    const parsed = combineDateAndTime(date, "12:00");
    return parsed ? formatReservationDate(parsed) : "";
  }, [date]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    setIsPending(true);

    const formData = new FormData();
    formData.set("branchSlug", branchSlug);
    formData.set("name", name);
    formData.set("phone", phone);
    formData.set("date", date);
    formData.set("time", time);
    formData.set("guests", String(guests));
    formData.set("comment", comment);

    try {
      const result = await createReservationAction(formData);
      if (!result.ok || !result.code) {
        setError(result.error ?? "Не удалось забронировать стол");
        return;
      }
      setCode(result.code);
      setActiveReservationCode(result.code);
      localStorage.setItem("activeReservationCode", result.code);
      setComment("");
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="guest-theme min-h-screen bg-[#121514] pb-16 text-ink-900">
      {/* Шапка */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#121514]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <span className="guest-display text-lg font-semibold tracking-[-0.02em] text-white">
            {restaurant.name}
          </span>
          {activeReservationCode ? (
            <Link
              href={`/reservation/${activeReservationCode}`}
              className="btn btn-primary btn-sm"
            >
              Моя бронь
            </Link>
          ) : (
            <a href="#booking" className="btn btn-primary btn-sm">
              Забронировать
            </a>
          )}
        </div>
      </header>

      {/* Герой-блок */}
      <section className="relative isolate overflow-hidden">
        {restaurant.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={restaurant.coverImageUrl}
            alt={restaurant.name}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/45" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/60">
            Санкт-Петербург · два филиала
          </p>
          <h1 className="guest-display mt-3 max-w-2xl text-4xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
            {restaurant.name}
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            {restaurant.description ??
              "Домашняя восточная кухня, тандыр, чай и спокойный зал. Забронируйте стол за минуту, мы встретим вас в нужное время."}
          </p>
          <div className="eastern-night-rating" aria-label="Оценка кафе 4,4 из 5">
            <strong>4,4</strong>
            <span>оценка гостей</span>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#booking" className="btn btn-primary min-h-11">
              Забронировать стол
            </a>
            <a
              href="#branches"
              className="btn min-h-11 border border-white/20 text-white hover:bg-white/10"
            >
              Наши филиалы
            </a>
          </div>
        </div>
      </section>

      {/* Коротко о нас */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map((item) => (
            <article
              key={item.title}
              className="guest-menu-card rounded-xl p-5"
            >
              <h3 className="guest-display text-lg font-semibold text-white">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/60">
                {item.text}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Филиалы */}
      <section id="branches" className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/50">
          Филиалы
        </p>
        <h2 className="guest-display mt-2 text-2xl font-semibold text-white">
          Выберите, куда вам удобнее
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {branches.map((item) => {
            const isActive = item.slug === branchSlug;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setBranchSlug(item.slug)}
                aria-pressed={isActive}
                className={`guest-menu-card rounded-xl p-5 text-left transition ${
                  isActive
                    ? "ring-2 ring-[#B7833E]"
                    : "opacity-80 hover:opacity-100"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="guest-display text-lg font-semibold text-white">
                      {item.name}
                    </h3>
                    <p className="mt-1 text-sm text-white/70">{item.address}</p>
                  </div>
                  <span
                    className={`mt-1 h-4 w-4 shrink-0 rounded-full border ${
                      isActive
                        ? "border-[#B7833E] bg-[#B7833E]"
                        : "border-white/30"
                    }`}
                  />
                </div>
                {item.description ? (
                  <p className="mt-3 text-sm leading-relaxed text-white/55">
                    {item.description}
                  </p>
                ) : null}
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-white/40">
                  Ежедневно {item.openTime} до {item.closeTime}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Бронирование */}
      <section id="booking" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="guest-menu-card rounded-2xl p-5 sm:p-8">
          {code ? (
            <div className="animate-fade-in text-center">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/50">
                Бронь принята
              </p>
              <h2 className="guest-display mt-2 text-2xl font-semibold text-white">
                Ждём вас, {name || "гость"}!
              </h2>
              <p className="mt-3 text-sm text-white/65">
                {branch?.name} · {branch?.address}
                <br />
                {dateLabel} в {time} · {guestsLabel(guests)}
              </p>
              <p className="mt-5 text-xs uppercase tracking-[0.16em] text-white/40">
                Код брони
              </p>
              <p className="guest-display mt-1 text-3xl font-semibold tracking-[0.2em] text-[#E0B472]">
                {code}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                  href={`/reservation/${code}/menu`}
                  className="btn btn-primary min-h-11"
                >
                  Выбрать блюда заранее
                </Link>
                <Link
                  href={`/reservation/${code}`}
                  className="btn min-h-11 border border-white/20 text-white hover:bg-white/10"
                >
                  Открыть бронь
                </Link>
                <button
                  type="button"
                  onClick={() => setCode(null)}
                  className="btn min-h-11 border border-white/20 text-white hover:bg-white/10"
                >
                  Забронировать ещё
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/50">
                Бронирование
              </p>
              <h2 className="guest-display mt-2 text-2xl font-semibold text-white">
                Забронировать стол
              </h2>
              <p className="mt-2 text-sm text-white/55">
                {branch
                  ? `${branch.name} · ${branch.address}`
                  : "Выберите филиал выше"}
              </p>

              <form onSubmit={submit} className="mt-6 space-y-5">
                {/* Дата: обычный календарь браузера */}
                <div>
                  <label className="label text-white/70" htmlFor="date">
                    Дата
                  </label>
                  <input
                    id="date"
                    type="date"
                    className="input"
                    value={date}
                    min={today}
                    max={maxDate}
                    onChange={(event) => setDate(event.target.value)}
                  />
                  {dateLabel ? (
                    <p className="mt-2 text-xs text-white/40">{dateLabel}</p>
                  ) : null}
                </div>

                {/* Время: любое, с точностью до минуты, кафе работает круглосуточно */}
                <div>
                  <label className="label text-white/70" htmlFor="time">
                    Время
                  </label>
                  <input
                    id="time"
                    type="time"
                    className="input"
                    value={time}
                    step={60}
                    onChange={(event) => setTime(event.target.value)}
                  />
                  <p className="mt-2 text-xs text-white/40">
                    {branch
                      ? workingHoursLabel(branch.openTime, branch.closeTime)
                      : "Круглосуточно"}
                    . Бронь принимаем минимум за{" "}
                    {RESERVATION_LIMITS.minLeadMinutes} минут.
                  </p>
                </div>

                {/* Гости: за столом максимум 4 места */}
                <div>
                  <span className="label text-white/70">Гостей</span>
                  <div className="mt-1 flex gap-2">
                    {Array.from(
                      { length: RESERVATION_LIMITS.maxGuests },
                      (_, index) => index + 1,
                    ).map((value) => {
                      const isActive = value === guests;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setGuests(value)}
                          aria-pressed={isActive}
                          className={`h-11 flex-1 rounded-lg border text-sm transition ${
                            isActive
                              ? "border-[#B7833E] bg-[#B7833E]/15 text-white"
                              : "border-white/12 text-white/60 hover:border-white/30"
                          }`}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-white/40">
                    За столом 4 места. Если вас больше, напишите в комментарии,
                    сдвинем несколько столов.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label text-white/70" htmlFor="branch">
                      Филиал
                    </label>
                    <select
                      id="branch"
                      className="input"
                      value={branchSlug}
                      onChange={(event) => setBranchSlug(event.target.value)}
                    >
                      {branches.map((item) => (
                        <option key={item.id} value={item.slug}>
                          {item.name}, {item.address}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label text-white/70" htmlFor="name">
                      Имя
                    </label>
                    <input
                      id="name"
                      className="input"
                      value={name}
                      maxLength={RESERVATION_LIMITS.nameMax}
                      placeholder="Как к вам обращаться"
                      onChange={(event) => setName(event.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label text-white/70" htmlFor="phone">
                      Телефон
                    </label>
                    <input
                      id="phone"
                      className="input"
                      inputMode="tel"
                      value={phone}
                      maxLength={20}
                      placeholder="+7 900 000-00-00"
                      onChange={(event) => setPhone(event.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label text-white/70" htmlFor="comment">
                      Комментарий
                    </label>
                    <input
                      id="comment"
                      className="input"
                      value={comment}
                      maxLength={RESERVATION_LIMITS.commentMax}
                      placeholder="Детский стул, место у окна, праздник"
                      onChange={(event) => setComment(event.target.value)}
                    />
                  </div>
                </div>

                {error ? (
                  <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </p>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-white/40">
                    Старший официант филиала подтвердит бронь по телефону.
                  </p>
                  <button
                    type="submit"
                    className="btn btn-primary min-h-11"
                    disabled={isPending}
                  >
                    {isPending ? "Отправляем" : "Забронировать"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </section>

      {/* Подвал */}
      <footer className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="border-t border-white/10 pt-6 text-sm text-white/45">
          <p className="guest-display text-base text-white/80">
            {restaurant.name}
          </p>
          <ul className="mt-2 space-y-1">
            {branches.map((item) => (
              <li key={item.id}>
                {item.address}, ежедневно {item.openTime} до {item.closeTime}
              </li>
            ))}
          </ul>
        </div>
      </footer>
    </div>
  );
}
