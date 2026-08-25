"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { changeOrderStatusAction } from "@/actions/orders";
import { updateWaiterCallAction } from "@/actions/calls";

type OrderStatus =
  "NEW" | "ACCEPTED" | "SENT_TO_KITCHEN" | "COMPLETED" | "CANCELED";
type CallStatus = "NEW" | "IN_PROGRESS" | "CLOSED";

export type StaffOrderDto = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  totalAmount: number;
  guestComment: string | null;
  createdAt: string;
  tableNumber: number;
  tableZone: string | null;
  acceptedByName: string | null;
  items: Array<{
    id: string;
    nameSnapshot: string;
    quantity: number;
    comment: string | null;
    totalPrice: number;
  }>;
};

export type StaffCallDto = {
  id: string;
  status: CallStatus;
  type: string;
  message: string | null;
  createdAt: string;
  tableNumber: number;
  tableZone: string | null;
};

type Tab = "new" | "active" | "done" | "calls";

const STATUS_LABELS: Record<OrderStatus, string> = {
  NEW: "Новый",
  ACCEPTED: "Принят",
  SENT_TO_KITCHEN: "На кухне",
  COMPLETED: "Выполнен",
  CANCELED: "Отменен",
};

const CALL_TYPE_LABELS: Record<string, string> = {
  WAITER: "Позвать официанта",
  BILL: "Счет",
  HELP: "Нужна помощь",
};

function money(amount: number, currency: string) {
  return `${new Intl.NumberFormat("ru-RU").format(amount)}\u00a0${currency}`;
}

function secondsSince(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
}

function timerLabel(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/**
 * Общая панель заказов смены. Обновляется поллингом каждые 4 секунды.
 * Структура готова к замене поллинга на WebSocket/SSE: достаточно подменить refresh().
 */
export function OrdersBoard({
  initialOrders,
  initialCalls,
  currency,
  initialTab = "new",
}: {
  initialOrders: StaffOrderDto[];
  initialCalls: StaffCallDto[];
  currency: string;
  initialTab?: Tab;
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [calls, setCalls] = useState(initialCalls);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [connected, setConnected] = useState(true);
  const [soundOn, setSoundOn] = useState(false);
  const [pollingEnabled, setPollingEnabled] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const knownNewIds = useRef(
    new Set(initialOrders.filter((o) => o.status === "NEW").map((o) => o.id)),
  );

  // Таймеры ожидания на карточках
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const playChime = useCallback(() => {
    if (!soundOn) return;
    try {
      const AudioContextCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextCtor) return;
      const context = new AudioContextCtor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.6);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.65);
    } catch {
      /* звук недоступен: не критично */
    }
  }, [soundOn]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/staff/feed", { cache: "no-store" });
      if (!response.ok) {
        setConnected(false);
        if (response.status === 401 || response.status === 403) {
          setPollingEnabled(false);
        }
        return;
      }
      const payload = (await response.json()) as {
        ok: boolean;
        orders: StaffOrderDto[];
        calls: StaffCallDto[];
      };
      if (!payload.ok) {
        setConnected(false);
        return;
      }
      setConnected(true);
      const freshNew = payload.orders.filter((order) => order.status === "NEW");
      const hasUnseen = freshNew.some(
        (order) => !knownNewIds.current.has(order.id),
      );
      knownNewIds.current = new Set(freshNew.map((order) => order.id));
      if (hasUnseen) playChime();
      setOrders(payload.orders);
      setCalls(payload.calls);
    } catch {
      setConnected(false);
    }
  }, [playChime]);

  useEffect(() => {
    if (!pollingEnabled) return;
    const timer = setInterval(refresh, 4000);
    return () => clearInterval(timer);
  }, [pollingEnabled, refresh]);

  function runStatus(orderId: string, nextStatus: OrderStatus) {
    setError(null);
    startTransition(async () => {
      const result = await changeOrderStatusAction(orderId, nextStatus);
      if (!result.ok) setError(result.error ?? "Не удалось изменить статус");
      await refresh();
    });
  }

  function runCall(callId: string, nextStatus: CallStatus) {
    setError(null);
    startTransition(async () => {
      const result = await updateWaiterCallAction(callId, nextStatus);
      if (!result.ok) setError(result.error ?? "Не удалось обновить вызов");
      await refresh();
    });
  }

  const newOrders = orders.filter((order) => order.status === "NEW");
  const activeOrders = orders.filter(
    (order) =>
      order.status === "ACCEPTED" || order.status === "SENT_TO_KITCHEN",
  );
  const doneOrders = orders.filter(
    (order) => order.status === "COMPLETED" || order.status === "CANCELED",
  );
  const openCalls = calls.filter((call) => call.status !== "CLOSED");

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: "new", label: "Новые", count: newOrders.length },
    { key: "active", label: "В работе", count: activeOrders.length },
    { key: "done", label: "Выполнены", count: doneOrders.length },
    { key: "calls", label: "Вызовы", count: openCalls.length },
  ];

  const visibleOrders =
    tab === "new"
      ? newOrders
      : tab === "active"
        ? activeOrders
        : tab === "done"
          ? doneOrders
          : [];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              connected ? "bg-emerald-500 animate-pulse-soft" : "bg-red-500"
            }`}
          />
          <span className="text-ink-500">
            {connected
              ? "Соединение активно · обновление каждые 4 сек"
              : "Нет связи с сервером"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSoundOn((value) => !value);
            }}
            className={`btn-sm rounded-full border px-3 py-1.5 text-xs font-semibold ${
              soundOn
                ? "border-wine-300 bg-wine-50 text-wine-700"
                : "border-cream-300 text-ink-500"
            }`}
          >
            {soundOn ? "Звук уведомлений: вкл" : "Звук уведомлений: выкл"}
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            className="btn-sm rounded-full border border-cream-300 px-3 py-1.5 text-xs font-semibold text-ink-500"
          >
            Обновить
          </button>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-ink-400">
        Заказы видны всем сотрудникам смены.
      </p>

      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`whitespace-nowrap rounded-lg border px-4 py-2 text-[13px] font-semibold transition ${
              tab === item.key
                ? "border-wine-600 bg-wine-600 text-white"
                : "border-cream-300 bg-white text-cream-200/75"
            }`}
          >
            {item.label}
            <span className="ml-2 rounded-md bg-black/15 px-2 py-0.5 text-[11px]">
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {tab === "calls" ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {openCalls.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-400">
              Активных вызовов нет
            </p>
          ) : null}
          {openCalls.map((call) => {
            const seconds = secondsSince(call.createdAt, now);
            return (
              <div
                key={call.id}
                className="rounded-xl border border-cream-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-semibold tracking-tight text-ink-900">
                      Стол {call.tableNumber}
                    </p>
                    <p className="text-xs text-ink-400">
                      {call.tableZone ?? "-"} ·{" "}
                      {CALL_TYPE_LABELS[call.type] ?? call.type}
                    </p>
                  </div>
                  <span className="rounded-md bg-amber-50 px-3 py-1 text-xs font-semibold text-gold-400">
                    {timerLabel(seconds)}
                  </span>
                </div>
                {call.message ? (
                  <p className="mt-2 text-sm text-ink-600">{call.message}</p>
                ) : null}
                <div className="mt-4 flex gap-2">
                  {call.status === "NEW" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => runCall(call.id, "IN_PROGRESS")}
                      className="btn-primary btn-sm"
                    >
                      Иду
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => runCall(call.id, "CLOSED")}
                    className="btn-sm rounded-xl border border-cream-300 px-3 py-2 text-xs font-semibold text-ink-600"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {visibleOrders.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-400">
              Заказов нет
            </p>
          ) : null}
          {visibleOrders.map((order) => {
            const seconds = secondsSince(order.createdAt, now);
            const waitingTooLong = order.status === "NEW" && seconds >= 120;
            const waitingWarning =
              order.status === "NEW" && seconds >= 60 && seconds < 120;
            return (
              <div
                key={order.id}
                className={`overflow-hidden rounded-2xl border bg-white ${
                  waitingTooLong
                    ? "border-red-500/60"
                    : waitingWarning
                      ? "border-amber-400/60"
                      : "border-cream-200"
                }`}
              >
                {order.status === "NEW" ? (
                  <div className="flex items-center justify-between bg-wine-600 px-4 py-2 text-xs font-semibold text-white">
                    <span>Новый заказ · требует подтверждения</span>
                    <span>{timerLabel(seconds)}</span>
                  </div>
                ) : null}

                {waitingTooLong ? (
                  <div className="bg-red-50 px-4 py-1.5 text-xs font-medium text-red-700">
                    Долго не принят
                  </div>
                ) : waitingWarning ? (
                  <div className="bg-amber-50 px-4 py-1.5 text-xs font-medium text-amber-700">
                    Заказ ждет больше минуты
                  </div>
                ) : null}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-semibold tracking-tight text-ink-900">
                        № {order.orderNumber} · Стол {order.tableNumber}
                      </p>
                      <p className="text-xs text-ink-400">
                        {order.tableZone ?? "-"} · {timerLabel(seconds)} назад
                      </p>
                    </div>
                    <span className="rounded-md bg-cream-100 px-3 py-1 text-[11px] font-semibold text-cream-200">
                      {STATUS_LABELS[order.status]}
                    </span>
                  </div>

                  <ul className="mt-3 space-y-1.5 text-sm text-ink-700">
                    {order.items.map((item) => (
                      <li key={item.id}>
                        <span className="font-semibold text-ink-900">
                          {item.quantity}×
                        </span>{" "}
                        {item.nameSnapshot}
                        {item.comment ? (
                          <span className="block pl-6 text-xs italic text-amber-700">
                            {item.comment}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>

                  {order.guestComment ? (
                    <p className="mt-3 rounded-xl bg-white px-3 py-2 text-xs text-ink-600">
                      <span className="font-semibold">Комментарий гостя: </span>
                      {order.guestComment}
                    </p>
                  ) : null}

                  <div className="mt-3 flex items-center justify-between border-t border-cream-200 pt-3">
                    <span className="text-xs text-ink-400">
                      {order.acceptedByName
                        ? `Принял: ${order.acceptedByName}`
                        : "Не принят"}
                    </span>
                    <span className="text-lg font-semibold tracking-tight text-ink-900">
                      {money(order.totalAmount, currency)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.status === "NEW" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => runStatus(order.id, "ACCEPTED")}
                        className="btn-primary btn-sm"
                      >
                        Принять
                      </button>
                    ) : null}
                    {order.status === "ACCEPTED" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => runStatus(order.id, "SENT_TO_KITCHEN")}
                        className="btn-primary btn-sm"
                      >
                        Передать на кухню
                      </button>
                    ) : null}
                    {order.status === "SENT_TO_KITCHEN" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => runStatus(order.id, "COMPLETED")}
                        className="btn-primary btn-sm"
                      >
                        Завершить
                      </button>
                    ) : null}
                    {order.status === "NEW" || order.status === "ACCEPTED" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Отменить заказ № ${order.orderNumber}?`,
                            )
                          ) {
                            runStatus(order.id, "CANCELED");
                          }
                        }}
                        className="btn-sm rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700"
                      >
                        Отменить
                      </button>
                    ) : null}
                    <Link
                      href={`/staff/orders/${order.id}`}
                      className="btn-sm rounded-xl border border-cream-300 px-3 py-2 text-xs font-semibold text-ink-600"
                    >
                      Подробнее
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
