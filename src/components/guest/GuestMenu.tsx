"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type GuestItemDto = {
  id: string;
  name: string;
  description: string | null;
  ingredients: string | null;
  allergens: string | null;
  price: number;
  weight: string | null;
  imageUrl: string | null;
  badges: string[];
  isStopListed: boolean;
};

export type GuestCategoryDto = {
  id: string;
  name: string;
  description: string | null;
  items: GuestItemDto[];
};

type CartLine = { itemId: string; quantity: number; comment: string; variant?: string };
type FlyingItem = {
  key: number;
  imageUrl: string | null;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

const DOBRY_FLAVORS = ["Апельсин", "Вишня", "Мультифрукт", "Томатный", "Яблочный"] as const;
const isDobryJuice = (item: GuestItemDto) => item.name.trim().toLocaleLowerCase("ru-RU") === "сок добрый";

const LIMITS = {
  itemComment: 150,
  orderComment: 300,
  maxQuantity: 20,
  maxPositions: 50,
};

function money(amount: number, currency: string) {
  return `${new Intl.NumberFormat("ru-RU").format(amount)}\u00a0${currency}`;
}

export function GuestMenu({
  restaurant,
  table,
  tableToken,
  reservation,
  categories,
}: {
  restaurant: {
    name: string;
    description: string | null;
    logoUrl: string | null;
    coverImageUrl: string | null;
    currency: string;
    isOrderingEnabled: boolean;
  };
  table?: {
    number: number;
    zone: string | null;
    branchName: string;
    branchAddress: string | null;
  };
  tableToken?: string;
  reservation?: { code: string; dateLabel: string; timeLabel: string };
  categories: GuestCategoryDto[];
}) {
  const router = useRouter();
  const isReservationMenu = Boolean(reservation);
  const storageKey = reservation
    ? `uchkuduk_reservation_cart_${reservation.code}`
    : `uchkuduk_cart_${tableToken}`;

  const [cart, setCart] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(categories[0]?.id ?? "");
  const [openItem, setOpenItem] = useState<GuestItemDto | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderComment, setOrderComment] = useState("");
  const [preorderTiming, setPreorderTiming] = useState<
    "SERVE_ON_ARRIVAL" | "PREPARE_AFTER_SEATING"
  >("SERVE_ON_ARRIVAL");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [callState, setCallState] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [callMessage, setCallMessage] = useState<string | null>(null);
  const [flyingItem, setFlyingItem] = useState<FlyingItem | null>(null);
  const [flyStarted, setFlyStarted] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const cartButtonRef = useRef<HTMLButtonElement | null>(null);
  const animationKey = useRef(0);

  const itemsById = useMemo(() => {
    const map = new Map<string, GuestItemDto>();
    for (const category of categories) {
      for (const item of category.items) map.set(item.id, item);
    }
    return map;
  }, [categories]);

  // Корзина живет на клиенте до отправки заказа
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setCart(JSON.parse(raw) as CartLine[]);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart, storageKey]);

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ru-RU");
    if (!query) return categories;
    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (item) =>
            item.name.toLocaleLowerCase("ru-RU").includes(query) ||
            (item.description ?? "").toLocaleLowerCase("ru-RU").includes(query) ||
            (item.ingredients ?? "").toLocaleLowerCase("ru-RU").includes(query) ||
            category.name.toLocaleLowerCase("ru-RU").includes(query),
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [categories, search]);

  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = cart.reduce((sum, line) => {
    const item = itemsById.get(line.itemId);
    return sum + (item ? item.price * line.quantity : 0);
  }, 0);

  function animateToCart(item: GuestItemDto, origin?: DOMRect) {
    const target = cartButtonRef.current?.getBoundingClientRect();
    const startX = origin
      ? origin.left + origin.width / 2
      : window.innerWidth / 2;
    const startY = origin
      ? origin.top + origin.height / 2
      : window.innerHeight * 0.68;
    const endX = target
      ? target.left + target.width / 2
      : window.innerWidth - 64;
    const endY = target ? target.top + target.height / 2 : 28;
    const key = ++animationKey.current;

    setFlyStarted(false);
    setFlyingItem({ key, imageUrl: item.imageUrl, startX, startY, endX, endY });
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setFlyStarted(true));
    });
    window.setTimeout(() => {
      setFlyingItem((current) => (current?.key === key ? null : current));
      setCartBounce(true);
    }, 620);
    window.setTimeout(() => setCartBounce(false), 900);
  }

  function addToCart(
    itemId: string,
    quantity = 1,
    comment = "",
    origin?: DOMRect,
    variant = "",
  ) {
    const item = itemsById.get(itemId);
    if (!item || item.isStopListed) return;
    animateToCart(item, origin);
    setCart((prev) => {
      const existing = prev.find(
        (line) => line.itemId === itemId && line.comment === comment && (line.variant ?? "") === variant,
      );
      if (existing) {
        return prev.map((line) =>
          line === existing
            ? {
                ...line,
                quantity: Math.min(
                  LIMITS.maxQuantity,
                  line.quantity + quantity,
                ),
              }
            : line,
        );
      }
      if (prev.length >= LIMITS.maxPositions) return prev;
      return [
        ...prev,
        { itemId, quantity: Math.min(LIMITS.maxQuantity, quantity), comment, variant: variant || undefined },
      ];
    });
  }

  function changeQuantity(index: number, delta: number) {
    setCart((prev) =>
      prev
        .map((line, lineIndex) =>
          lineIndex === index
            ? {
                ...line,
                quantity: Math.max(
                  0,
                  Math.min(LIMITS.maxQuantity, line.quantity + delta),
                ),
              }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  function removeLine(index: number) {
    setCart((prev) => prev.filter((_, lineIndex) => lineIndex !== index));
  }

  function scrollToCategory(categoryId: string) {
    setActiveCategory(categoryId);
    sectionRefs.current[categoryId]?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function submitOrder() {
    if (cart.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        isReservationMenu ? "/api/guest/reservation-order" : "/api/guest/order",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(isReservationMenu
              ? {
                  reservationCode: reservation?.code,
                  timing: preorderTiming,
                }
              : { tableToken }),
            comment: orderComment,
            // Цены на сервер не отправляются: только id, количество и комментарий
            items: cart.map((line) => ({
              menuItemId: line.itemId,
              quantity: line.quantity,
              comment: [line.variant ? `Вкус: ${line.variant}` : "", line.comment].filter(Boolean).join(" · ") || undefined,
            })),
          }),
        },
      );
      const payload = (await response.json()) as {
        ok: boolean;
        orderId?: string;
        preorderId?: string;
        error?: string;
      };
      const createdId = isReservationMenu
        ? payload.preorderId
        : payload.orderId;
      if (!response.ok || !payload.ok || !createdId) {
        setError(payload.error ?? "Не удалось отправить заказ");
        setSubmitting(false);
        return;
      }
      window.localStorage.removeItem(storageKey);
      router.push(
        isReservationMenu
          ? `/reservation/${reservation?.code}`
          : `/order/${payload.orderId}?tableToken=${encodeURIComponent(tableToken ?? "")}`,
      );
    } catch {
      setError("Нет связи с сервером. Попробуйте еще раз.");
      setSubmitting(false);
    }
  }

  async function callWaiter(type: "WAITER" | "BILL") {
    if (!tableToken) return;
    setCallState("sending");
    try {
      const response = await fetch("/api/guest/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableToken, type }),
      });
      const payload = (await response.json()) as {
        ok: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        setCallState("error");
        setCallMessage(payload.error ?? "Не удалось позвать официанта");
        return;
      }
      setCallState("sent");
      setCallMessage("Официант уведомлен и скоро подойдет");
      setTimeout(() => setCallState("idle"), 8000);
    } catch {
      setCallState("error");
      setCallMessage("Нет связи с сервером");
    }
  }

  return (
    <div className="guest-theme min-h-screen bg-[#121514] pb-16 text-ink-900">
      <header className="border-b border-cream-200 bg-white">
        <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:flex-nowrap sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {restaurant.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/images/uchkuduk-logo.webp"
                alt={`Логотип ${restaurant.name}`}
                className="h-11 w-11 shrink-0 rounded-lg object-contain"
              />
            ) : null}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight text-ink-900">
                {restaurant.name}
              </p>
              <p className="mt-0.5 text-xs text-ink-400">
              {reservation ? (
                <>
                  Предзаказ к брони {reservation.code} · {reservation.dateLabel}{" "}
                  в {reservation.timeLabel}
                </>
              ) : (
                <>
                   {table?.branchName} · стол {table?.number}
                   {table?.zone ? ` · ${table.zone}` : ""}
                </>
              )}
              </p>
            </div>
          </div>
          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
            <Link
              href={
                reservation
                  ? `/reservation/${reservation.code}`
                  : `/menu/${tableToken}/activity`
              }
              className="min-h-10 flex-1 rounded-lg border border-cream-300 bg-white px-3.5 py-2.5 text-center text-sm font-medium text-ink-700 transition hover:bg-cream-100 sm:flex-none"
            >
              {reservation ? "Моя бронь" : "Мои заказы"}
            </Link>
            {!reservation ? (
              <button
                type="button"
                onClick={() => callWaiter("WAITER")}
                disabled={callState === "sending"}
                className="min-h-10 flex-1 rounded-lg border border-cream-300 bg-white px-3.5 text-sm font-medium text-ink-700 transition hover:bg-cream-100 disabled:opacity-50 sm:flex-none"
              >
                {callState === "sending"
                  ? "Отправляем..."
                  : "Позвать официанта"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6">
          <div
            className={`overflow-hidden bg-ink-900 ${restaurant.coverImageUrl ? "relative min-h-[210px] rounded-xl sm:min-h-[280px]" : "rounded-xl px-6 py-10"}`}
          >
            {restaurant.coverImageUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={restaurant.coverImageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/45" />
              </>
            ) : null}
            <div
              className={`${restaurant.coverImageUrl ? "absolute inset-x-0 bottom-0 p-5 sm:p-8" : "relative"} max-w-xl`}
            >
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/90 drop-shadow-sm">
                Восточная кухня
              </p>
              <h1 className="guest-display mt-2 text-4xl font-semibold tracking-[-0.03em] text-white drop-shadow-md sm:text-5xl">
                {restaurant.name}
              </h1>
              {restaurant.description ? (
                <p className="mt-2 max-w-md text-sm leading-relaxed text-white/95 drop-shadow-sm sm:text-base">
                  {restaurant.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex items-start gap-3 rounded-lg border border-cream-200 bg-white px-4 py-3.5">
            <span className="mt-1 block h-2 w-2 shrink-0 rounded-full bg-wine-600" />
            <p className="text-sm leading-relaxed text-ink-600">
              {reservation
                ? "Предзаказ увидит старший официант вашего филиала. Способ приготовления вы выберете в корзине."
                : "Заказ увидит официант и подтвердит перед передачей на кухню."}
            </p>
          </div>
          {callMessage && callState !== "idle" ? (
            <p
              className={`mt-2 text-sm ${callState === "error" ? "text-red-600" : "text-emerald-700"}`}
            >
              {callMessage}
            </p>
          ) : null}
          {!restaurant.isOrderingEnabled ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Сейчас заказы через меню временно недоступны. Обратитесь к
              официанту.
            </div>
          ) : null}
        </div>
      </header>

      <div className="sticky top-0 z-20 border-b border-cream-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Найти блюдо"
              className="h-11 min-w-0 flex-1 rounded-lg border border-cream-300 bg-cream-100 px-4 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-wine-500 focus:bg-white focus:ring-2 focus:ring-wine-500/10"
              type="search"
              maxLength={60}
            />
            <button
              ref={cartButtonRef}
              type="button"
              onClick={() => setCartOpen(true)}
              className={`flex h-11 shrink-0 items-center gap-2 rounded-lg bg-ink-900 px-4 text-sm font-semibold text-white transition hover:bg-ink-700 ${cartBounce ? "cart-target-bounce" : ""}`}
            >
              <span>Корзина</span>
              <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-xs">
                {cartCount}
              </span>
            </button>
          </div>
          <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => scrollToCategory(category.id)}
                className={`min-h-9 whitespace-nowrap rounded-lg px-3 text-sm font-medium transition ${activeCategory === category.id ? "bg-wine-600 text-white" : "text-ink-500 hover:bg-cream-100 hover:text-ink-900"}`}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Список блюд */}
      <main className="mx-auto max-w-6xl px-4 sm:px-6">
        {filteredCategories.length === 0 ? (
          <p className="py-16 text-center text-sm text-ink-500">
            Ничего не найдено
          </p>
        ) : null}
        {filteredCategories.map((category) => (
          <section
            key={category.id}
            ref={(element) => {
              sectionRefs.current[category.id] = element;
            }}
            className="scroll-mt-32 pt-9 sm:pt-12"
          >
            <div className="mb-4">
              <h2 className="guest-display text-2xl font-semibold tracking-[-0.025em] text-ink-900">
                {category.name}
              </h2>
              {category.description ? (
                <p className="mt-1 text-[13px] text-ink-500">
                  {category.description}
                </p>
              ) : null}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {category.items.map((item) => (
                <article
                  key={item.id}
                  className={`guest-menu-card group flex min-h-[136px] gap-4 overflow-hidden rounded-xl border border-cream-200 bg-white p-3 transition hover:border-cream-300 ${item.isStopListed ? "opacity-60" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenItem(item)}
                    className="h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-cream-200 sm:h-32 sm:w-32"
                  >
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : null}
                  </button>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.badges.map((badge) => (
                        <span
                          key={badge}
                          className="badge bg-wine-50 text-wine-700"
                        >
                          {badge}
                        </span>
                      ))}
                      {item.isStopListed ? (
                        <span className="badge bg-cream-200 text-ink-500">
                          Стоп-лист
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenItem(item)}
                      className="mt-1 text-left text-[17px] font-semibold leading-snug tracking-[-0.01em] text-ink-900"
                    >
                      {item.name}
                    </button>
                    {item.description ? (
                      <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-500">
                        {item.description}
                      </p>
                    ) : null}
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div>
                        <p className="text-[15px] font-semibold text-ink-900">
                          {money(item.price, restaurant.currency)}
                        </p>
                        {item.weight ? (
                          <p className="text-[11px] text-ink-400">
                            {item.weight}
                          </p>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        disabled={
                          item.isStopListed || !restaurant.isOrderingEnabled
                        }
                        onClick={(event) => {
                          const image = event.currentTarget
                            .closest("article")
                            ?.querySelector("img");
                          if (isDobryJuice(item)) {
                            setOpenItem(item);
                            return;
                          }
                          addToCart(
                            item.id,
                            1,
                            "",
                            image?.getBoundingClientRect() ??
                              event.currentTarget.getBoundingClientRect(),
                          );
                        }}
                        className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-wine-600 px-3 text-sm font-semibold text-white transition hover:bg-wine-700 disabled:bg-cream-200 disabled:text-ink-400"
                      >
                        {item.isStopListed ? "Нет" : "+ Добавить"}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}
      </main>

      {flyingItem ? (
        <div
          key={flyingItem.key}
          aria-hidden="true"
          className="pointer-events-none fixed z-[70] h-14 w-14 overflow-hidden rounded-xl border-2 border-white bg-wine-600 shadow-lg transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,0.8,0.25,1)]"
          style={{
            left: flyingItem.startX - 28,
            top: flyingItem.startY - 28,
            transform: flyStarted
              ? `translate3d(${flyingItem.endX - flyingItem.startX}px, ${flyingItem.endY - flyingItem.startY}px, 0) scale(0.28) rotate(12deg)`
              : "translate3d(0, 0, 0) scale(1) rotate(0deg)",
            opacity: flyStarted ? 0.2 : 1,
          }}
        >
          {flyingItem.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={flyingItem.imageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-white">
              +
            </span>
          )}
        </div>
      ) : null}

      {/* Bottom sheet блюда */}
      {openItem ? (
        <ItemSheet
          item={openItem}
          currency={restaurant.currency}
          disabled={!restaurant.isOrderingEnabled}
          onClose={() => setOpenItem(null)}
          onAdd={(quantity, comment, origin, variant) => {
            addToCart(openItem.id, quantity, comment, origin, variant);
            setOpenItem(null);
          }}
        />
      ) : null}

      {/* Bottom sheet корзины */}
      {cartOpen ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-900/35 p-0 backdrop-blur-[2px] animate-fade-in sm:items-center sm:p-6">
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0"
            onClick={() => setCartOpen(false)}
          />
          <div className="relative z-10 max-h-[88vh] w-full overflow-y-auto rounded-t-2xl border border-cream-200 bg-white p-5 shadow-sheet animate-sheet-up sm:max-w-lg sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-2xl font-semibold tracking-tight">
                Ваш заказ
              </h3>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="btn-ghost btn-sm"
              >
                Закрыть
              </button>
            </div>

            <p className="mb-3 text-xs text-ink-500">
              {reservation ? (
                <>Бронь {reservation.code}</>
              ) : (
                <>
                  Стол {table?.number}
                  {table?.zone ? ` · ${table.zone}` : ""}
                </>
              )}
            </p>

            <div className="space-y-2">
              {cart.map((line, index) => {
                const item = itemsById.get(line.itemId);
                if (!item) return null;
                return (
                  <div
                    key={`${line.itemId}-${index}`}
                    className="rounded-lg border border-cream-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-ink-900">{item.name}</p>
                        {line.variant ? (
                          <p className="mt-0.5 text-xs font-semibold text-wine-700">
                            Вкус: {line.variant}
                          </p>
                        ) : null}
                        {line.comment ? (
                          <p className="mt-0.5 text-xs italic text-ink-500">
                            {line.comment}
                          </p>
                        ) : null}
                        <p className="mt-1 text-xs text-ink-400">
                          {money(item.price, restaurant.currency)} ×{" "}
                          {line.quantity}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => changeQuantity(index, -1)}
                          className="h-9 w-9 rounded-lg border border-cream-300 text-lg leading-none text-ink-700"
                        >
                          -
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQuantity(index, 1)}
                          className="h-9 w-9 rounded-lg border border-cream-300 text-lg leading-none text-ink-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="mt-2 text-xs font-medium text-red-600"
                    >
                      Убрать
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4">
              <label className="label" htmlFor="order-comment">
                Комментарий к заказу
              </label>
              <textarea
                id="order-comment"
                value={orderComment}
                onChange={(event) =>
                  setOrderComment(
                    event.target.value.slice(0, LIMITS.orderComment),
                  )
                }
                maxLength={LIMITS.orderComment}
                rows={3}
                className="input"
                placeholder="Например: принести все сразу"
              />
              <p className="mt-1 text-right text-[11px] text-ink-400">
                {orderComment.length}/{LIMITS.orderComment}
              </p>
            </div>

            {reservation ? (
              <fieldset className="mt-4">
                <legend className="label">Когда готовить блюда</legend>
                <div className="space-y-2">
                  <label className="flex cursor-pointer gap-3 rounded-xl border border-cream-300 p-3 text-sm">
                    <input
                      type="radio"
                      name="preorderTiming"
                      value="SERVE_ON_ARRIVAL"
                      checked={preorderTiming === "SERVE_ON_ARRIVAL"}
                      onChange={() => setPreorderTiming("SERVE_ON_ARRIVAL")}
                      className="mt-1"
                    />
                    <span>
                      <strong className="block text-ink-900">
                        Подать сразу после прихода
                      </strong>
                      <span className="text-ink-500">
                        Кухня приготовит заранее, блюда подадут после вашей
                        посадки за стол.
                      </span>
                    </span>
                  </label>
                  <label className="flex cursor-pointer gap-3 rounded-xl border border-cream-300 p-3 text-sm">
                    <input
                      type="radio"
                      name="preorderTiming"
                      value="PREPARE_AFTER_SEATING"
                      checked={preorderTiming === "PREPARE_AFTER_SEATING"}
                      onChange={() =>
                        setPreorderTiming("PREPARE_AFTER_SEATING")
                      }
                      className="mt-1"
                    />
                    <span>
                      <strong className="block text-ink-900">
                        Готовить после прихода
                      </strong>
                      <span className="text-ink-500">
                        Старший официант отправит заказ на кухню, когда отметит,
                        что вы уже за столом.
                      </span>
                    </span>
                  </label>
                </div>
              </fieldset>
            ) : null}

            {error ? (
              <p className="mt-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="mt-4 flex items-center justify-between border-t border-cream-200 pt-4">
              <span className="text-sm text-ink-500">Итого</span>
              <span className="text-2xl font-semibold tracking-tight">
                {money(cartTotal, restaurant.currency)}
              </span>
            </div>
            <button
              type="button"
              onClick={submitOrder}
              disabled={
                submitting || cart.length === 0 || !restaurant.isOrderingEnabled
              }
              className="btn-primary mt-4 w-full"
            >
              {submitting
                ? "Отправляем..."
                : reservation
                  ? "Оформить предзаказ"
                  : "Отправить официанту"}
            </button>
            <p className="mt-3 text-center text-[11px] text-ink-400">
              Оплата: как обычно, у официанта или на кассе
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ItemSheet({
  item,
  currency,
  disabled,
  onClose,
  onAdd,
}: {
  item: GuestItemDto;
  currency: string;
  disabled: boolean;
  onClose: () => void;
  onAdd: (quantity: number, comment: string, origin: DOMRect, variant: string) => void;
}) {
  const [quantity, setQuantity] = useState(1);
  const [comment, setComment] = useState("");
  const [variant, setVariant] = useState<string>(() => isDobryJuice(item) ? DOBRY_FLAVORS[0] : "");

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink-900/35 p-0 backdrop-blur-[2px] animate-fade-in sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Закрыть"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-cream-200 bg-white shadow-sheet animate-sheet-up sm:max-w-xl sm:rounded-2xl">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-60 w-full object-cover sm:h-72"
          />
        ) : null}
        <div className="p-5">
          <div className="flex flex-wrap gap-1.5">
            {item.badges.map((badge) => (
              <span key={badge} className="badge bg-wine-50 text-wine-700">
                {badge}
              </span>
            ))}
            {item.isStopListed ? (
              <span className="badge bg-cream-200 text-ink-500">Стоп-лист</span>
            ) : null}
          </div>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">
            {item.name}
          </h3>
          {item.description ? (
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              {item.description}
            </p>
          ) : null}
          <div className="mt-4 space-y-2 text-[13px]">
            {item.ingredients ? (
              <p>
                <span className="font-semibold text-ink-700">Состав: </span>
                <span className="text-ink-500">{item.ingredients}</span>
              </p>
            ) : null}
            {item.allergens ? (
              <p>
                <span className="font-semibold text-ink-700">Аллергены: </span>
                <span className="text-ink-500">{item.allergens}</span>
              </p>
            ) : null}
            {item.weight ? (
              <p>
                <span className="font-semibold text-ink-700">Выход: </span>
                <span className="text-ink-500">{item.weight}</span>
              </p>
            ) : null}
          </div>

          {isDobryJuice(item) ? (
            <div className="mt-5">
              <label className="label" htmlFor="item-variant">Вкус сока</label>
              <select id="item-variant" value={variant} onChange={(event) => setVariant(event.target.value)} className="input">
                {DOBRY_FLAVORS.map((flavor) => <option key={flavor} value={flavor}>{flavor}</option>)}
              </select>
            </div>
          ) : null}

          <div className="mt-5">
            <label className="label" htmlFor="item-comment">
              Комментарий к блюду
            </label>
            <textarea
              id="item-comment"
              value={comment}
              onChange={(event) =>
                setComment(event.target.value.slice(0, LIMITS.itemComment))
              }
              maxLength={LIMITS.itemComment}
              rows={2}
              className="input"
              placeholder="Например: без лука"
            />
            <p className="mt-1 text-right text-[11px] text-ink-400">
              {comment.length}/{LIMITS.itemComment}
            </p>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                className="h-10 w-10 rounded-lg border border-cream-300 bg-white text-xl leading-none transition hover:bg-cream-100"
              >
                -
              </button>
              <span className="w-6 text-center text-base font-semibold">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() =>
                  setQuantity((value) =>
                    Math.min(LIMITS.maxQuantity, value + 1),
                  )
                }
                className="h-10 w-10 rounded-lg border border-cream-300 bg-white text-xl leading-none transition hover:bg-cream-100"
              >
                +
              </button>
            </div>
            <p className="text-xl font-semibold tracking-tight">
              {money(item.price * quantity, currency)}
            </p>
          </div>

          <button
            type="button"
            disabled={item.isStopListed || disabled}
            onClick={(event) =>
              onAdd(
                quantity,
                comment.trim(),
                event.currentTarget.getBoundingClientRect(),
                variant,
              )
            }
            className="btn-primary mt-5 w-full"
          >
            {item.isStopListed ? "Блюдо в стоп-листе" : "Добавить в корзину"}
          </button>
        </div>
      </div>
    </div>
  );
}
