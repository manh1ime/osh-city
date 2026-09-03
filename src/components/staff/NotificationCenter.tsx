"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  StaffNotification,
  StaffNotificationKind,
} from "@/lib/notifications";

/**
 * Центр уведомлений персонала.
 *
 * Сигнал должен дойти до официанта, даже если панель открыта на другой вкладке,
 * поэтому используются три независимых канала:
 * 1) счётчик и список в шапке (работает всегда);
 * 2) звук через Web Audio (включается кнопкой: iOS и Chrome запрещают
 *    автозапуск звука без жеста пользователя);
 * 3) системное уведомление браузера (нужно разрешение, тоже по жесту).
 *
 * Отметка «просмотрено» живёт в localStorage: событие закрывается сменой
 * статуса заказа или брони, отдельная таблица «прочитанных» не нужна.
 */

const POLL_INTERVAL_MS = 10_000;
const SEEN_STORAGE_KEY = "uchkuduk_notify_seen_v2";
const SOUND_STORAGE_KEY = "uchkuduk_notify_sound_v2";
const SEEN_LIMIT = 200;

const KIND_LABEL: Record<StaffNotificationKind, string> = {
  ORDER_NEW: "Заказ",
  ORDER_WAITING: "Просрочен",
  CALL_NEW: "Вызов",
  RESERVATION_NEW: "Бронь",
  PREORDER_NEW: "Предзаказ",
  PREORDER_READY: "Готово",
};

const KIND_BADGE: Record<StaffNotificationKind, string> = {
  ORDER_NEW: "bg-[#B7833E]/25 text-[#E7C68C]",
  ORDER_WAITING: "bg-red-500/20 text-red-200",
  CALL_NEW: "bg-sky-500/20 text-sky-200",
  RESERVATION_NEW: "bg-emerald-500/20 text-emerald-200",
  PREORDER_NEW: "bg-violet-500/20 text-violet-200",
  PREORDER_READY: "bg-emerald-500/15 text-emerald-200",
};

type Feed = {
  notifications: StaffNotification[];
  scope: { orders: boolean; calls: boolean; reservations: boolean };
};

function readSeen(): string[] {
  try {
    const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]) {
  try {
    window.localStorage.setItem(
      SEEN_STORAGE_KEY,
      JSON.stringify(ids.slice(-SEEN_LIMIT)),
    );
  } catch {
    /* приватный режим: счётчик просто не запомнится */
  }
}

function elapsed(iso: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return `${seconds} с`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ч ${minutes % 60} мин`;
}

export function NotificationCenter() {
  const [feed, setFeed] = useState<Feed>({
    notifications: [],
    scope: { orders: true, calls: true, reservations: false },
  });
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [pushState, setPushState] = useState<NotificationPermission | "unsupported">(
    "default",
  );
  const [connected, setConnected] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [unseenIds, setUnseenIds] = useState<string[]>([]);

  const seenRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const pollingRef = useRef(true);

  // Восстанавливаем состояние до первого запроса, чтобы уже известные события
  // не зазвучали снова после перезагрузки страницы.
  useEffect(() => {
    seenRef.current = new Set(readSeen());
    setSoundOn(window.localStorage.getItem(SOUND_STORAGE_KEY) === "on");
    setPushState(
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "unsupported",
    );
    hydratedRef.current = true;
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const chime = useCallback(
    (urgency: StaffNotification["urgency"]) => {
      const context = audioRef.current;
      if (!context) return;
      try {
        if (context.state === "suspended") void context.resume();
        // Срочное событие — две ноты, обычное — одна: официант различает на слух.
        const tones = urgency === "high" ? [880, 1180] : [660];
        tones.forEach((frequency, index) => {
          const startAt = context.currentTime + index * 0.18;
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.type = "sine";
          oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(0.0001, startAt);
          gain.gain.exponentialRampToValueAtTime(0.22, startAt + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.42);
          oscillator.connect(gain).connect(context.destination);
          oscillator.start(startAt);
          oscillator.stop(startAt + 0.45);
        });
      } catch {
        /* звук не критичен для работы смены */
      }
    },
    [],
  );

  const showPush = useCallback((items: StaffNotification[]) => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }
    // Не заваливаем систему: при пачке событий показываем максимум три.
    for (const item of items.slice(0, 3)) {
      try {
        const notification = new Notification(item.title, {
          body: item.body,
          // tag не даёт дублей одного события при повторном поллинге.
          tag: item.id,
          silent: false,
        });
        notification.onclick = () => {
          window.focus();
          window.location.assign(item.href);
        };
      } catch {
        /* браузер может отклонить показ: игнорируем */
      }
    }
  }, []);

  const vibrate = useCallback(() => {
    try {
      navigator.vibrate?.([120, 60, 120]);
    } catch {
      /* не поддерживается */
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/staff/notifications", {
        cache: "no-store",
      });
      if (!response.ok) {
        setConnected(false);
        // 401/403: сессия закончилась, дальше поллить бессмысленно.
        if (response.status === 401 || response.status === 403) {
          pollingRef.current = false;
        }
        return;
      }
      const payload = (await response.json()) as {
        ok: boolean;
        notifications?: StaffNotification[];
        scope?: Feed["scope"];
      };
      if (!payload.ok || !payload.notifications) {
        setConnected(false);
        return;
      }
      setConnected(true);

      const incoming = payload.notifications;
      const fresh = incoming.filter((item) => !seenRef.current.has(item.id));
      setFeed({
        notifications: incoming,
        scope: payload.scope ?? {
          orders: true,
          calls: true,
          reservations: false,
        },
      });
      setUnseenIds(fresh.map((item) => item.id));

      if (fresh.length > 0) {
        const urgent = fresh.some((item) => item.urgency === "high");
        chime(urgent ? "high" : "normal");
        if (urgent) vibrate();
        showPush(fresh);
      }
    } catch {
      setConnected(false);
    }
  }, [chime, showPush, vibrate]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    void refresh();
    const timer = window.setInterval(() => {
      if (pollingRef.current) void refresh();
    }, POLL_INTERVAL_MS);
    // Вкладку в фоне браузер тормозит: при возврате обновляем сразу.
    const onVisible = () => {
      if (!document.hidden && pollingRef.current) void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  function markAllSeen() {
    const ids = feed.notifications.map((item) => item.id);
    for (const id of ids) seenRef.current.add(id);
    writeSeen([...seenRef.current]);
    setUnseenIds([]);
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) markAllSeen();
  }

  /** Включение звука — это жест пользователя: только здесь можно создать AudioContext. */
  async function toggleSound() {
    if (soundOn) {
      setSoundOn(false);
      window.localStorage.setItem(SOUND_STORAGE_KEY, "off");
      return;
    }
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (Ctor) {
        audioRef.current = audioRef.current ?? new Ctor();
        await audioRef.current.resume();
      }
      setSoundOn(true);
      window.localStorage.setItem(SOUND_STORAGE_KEY, "on");
      chime("normal");
    } catch {
      setSoundOn(false);
    }
  }

  async function enablePush() {
    if (!("Notification" in window)) return;
    try {
      const permission = await Notification.requestPermission();
      setPushState(permission);
    } catch {
      /* пользователь закрыл запрос */
    }
  }

  useEffect(() => {
    if (!soundOn) audioRef.current?.suspend().catch(() => undefined);
  }, [soundOn]);

  const unseenCount = unseenIds.length;
  const urgentCount = useMemo(
    () =>
      feed.notifications.filter(
        (item) => item.urgency === "high" && unseenIds.includes(item.id),
      ).length,
    [feed.notifications, unseenIds],
  );

  // Заголовок вкладки — единственный канал, который виден на свёрнутом окне.
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = unseenCount > 0 ? `(${unseenCount}) ${base}` : base;
  }, [unseenCount]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={
          unseenCount > 0
            ? `Уведомления: ${unseenCount} новых`
            : "Уведомления"
        }
        aria-expanded={open}
        className={`relative flex h-10 min-w-10 items-center justify-center rounded-lg border px-2.5 text-sm font-semibold transition ${
          urgentCount > 0
            ? "border-red-400/50 bg-red-500/15 text-red-100"
            : "border-cream-300 text-ink-600"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-5 w-5 ${urgentCount > 0 ? "animate-pulse-soft" : ""}`}
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unseenCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
            {unseenCount > 99 ? "99+" : unseenCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Закрыть уведомления"
            className="fixed inset-0 z-30 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 z-40 mt-2 max-h-[70vh] w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-cream-200 bg-white p-3 shadow-sheet">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-ink-900">Уведомления</p>
              <span
                className={`text-[11px] ${connected ? "text-ink-400" : "text-red-500"}`}
              >
                {connected ? "обновление 10 сек" : "нет связи"}
              </span>
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleSound}
                className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                  soundOn
                    ? "border-wine-500 bg-wine-50 text-wine-700"
                    : "border-cream-300 text-ink-500"
                }`}
              >
                {soundOn ? "Звук включён" : "Включить звук"}
              </button>
              {pushState === "unsupported" ? null : pushState === "granted" ? (
                <span className="rounded-lg border border-cream-300 px-2.5 py-1.5 text-[11px] font-semibold text-ink-400">
                  Push разрешён
                </span>
              ) : pushState === "denied" ? (
                <span className="rounded-lg border border-cream-300 px-2.5 py-1.5 text-[11px] font-semibold text-ink-400">
                  Push запрещён в браузере
                </span>
              ) : (
                <button
                  type="button"
                  onClick={enablePush}
                  className="rounded-lg border border-cream-300 px-2.5 py-1.5 text-[11px] font-semibold text-ink-500"
                >
                  Разрешить push
                </button>
              )}
            </div>

            {!soundOn ? (
              <p className="mt-2 rounded-lg bg-cream-100 px-3 py-2 text-[11px] leading-relaxed text-ink-500">
                Звук выключен. Браузер разрешает включить его только нажатием —
                нажмите «Включить звук» в начале смены.
              </p>
            ) : null}

            <div className="mt-3 space-y-2">
              {feed.notifications.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-400">
                  Новых событий нет
                </p>
              ) : null}

              {feed.notifications.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg border p-3 transition hover:bg-cream-100 ${
                    item.urgency === "high"
                      ? "border-red-300/60"
                      : "border-cream-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`badge ${KIND_BADGE[item.kind]} whitespace-nowrap`}
                    >
                      {KIND_LABEL[item.kind]}
                    </span>
                    <span className="shrink-0 text-[11px] text-ink-400">
                      {elapsed(item.createdAt, now)}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-ink-900">
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
                    {item.body}
                  </p>
                </Link>
              ))}
            </div>

            {!feed.scope.reservations ? (
              <p className="mt-3 border-t border-cream-200 pt-2 text-[11px] leading-relaxed text-ink-400">
                Брони и предзаказы ведёт старший официант — они не приходят в эту
                ленту.
              </p>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
