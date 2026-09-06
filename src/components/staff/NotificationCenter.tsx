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
 * Четыре канала, потому что ни один не работает всегда:
 * 1) счётчик и список в шапке — работает при открытой панели;
 * 2) заголовок вкладки — виден на свёрнутом окне;
 * 3) звук и вибрация — когда телефон в кармане, но панель открыта;
 * 4) Web Push через service worker — единственный канал при закрытом браузере.
 *
 * Звук и вибрация срабатывают на ЛЮБОЕ новое событие: заказ, вызов, счёт,
 * бронь, предзаказ и готовность предзаказа. Раньше звучал только новый заказ.
 */

const POLL_INTERVAL_MS = 10_000;
const SEEN_STORAGE_KEY = "osh-city_notify_seen_v3";
const SOUND_STORAGE_KEY = "osh-city_notify_sound_v3";
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

/**
 * Звуковая подпись события: официант различает тип на слух, не глядя на экран.
 * Частоты в герцах, длительность в секундах.
 */
const SOUND_PATTERN: Record<
  StaffNotificationKind,
  { tones: number[]; gap: number }
> = {
  ORDER_NEW: { tones: [880, 1180], gap: 0.16 },
  ORDER_WAITING: { tones: [1180, 880, 1180, 880], gap: 0.14 },
  CALL_NEW: { tones: [1320, 990, 1320], gap: 0.13 },
  RESERVATION_NEW: { tones: [660, 880, 1100], gap: 0.15 },
  PREORDER_NEW: { tones: [740, 990], gap: 0.18 },
  PREORDER_READY: { tones: [990, 1240], gap: 0.14 },
};

/** Рисунок вибрации по типу события. */
const VIBRATION_PATTERN: Record<StaffNotificationKind, number[]> = {
  ORDER_NEW: [200, 100, 200],
  ORDER_WAITING: [300, 120, 300, 120, 400],
  CALL_NEW: [150, 80, 150, 80, 150],
  RESERVATION_NEW: [250, 120, 250],
  PREORDER_NEW: [200, 100, 300],
  PREORDER_READY: [180, 90, 180],
};

type Scope = {
  orders: boolean;
  calls: boolean;
  reservations: boolean;
  branchName: string | null;
};

type PushState =
  | "unsupported"
  | "default"
  | "granted"
  | "denied"
  | "subscribing"
  | "subscribed";

function readSeen(): string[] {
  try {
    const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value) => typeof value === "string")
      : [];
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
  const seconds = Math.max(
    0,
    Math.floor((now - new Date(iso).getTime()) / 1000),
  );
  if (seconds < 60) return `${seconds} с`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  return `${hours} ч ${minutes % 60} мин`;
}

/** Base64URL из VAPID -> ArrayBuffer, как требует PushManager. */
function urlBase64ToBuffer(base64: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const buffer = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buffer);
  for (let index = 0; index < raw.length; index += 1) {
    view[index] = raw.charCodeAt(index);
  }
  return buffer;
}

/** iOS присылает push только из приложения, добавленного на домашний экран. */
function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<StaffNotification[]>([]);
  const [scope, setScope] = useState<Scope>({
    orders: true,
    calls: true,
    reservations: false,
    branchName: null,
  });
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [pushState, setPushState] = useState<PushState>("default");
  const [pushError, setPushError] = useState<string | null>(null);
  const [testState, setTestState] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  const [now, setNow] = useState(() => Date.now());
  const [unseenIds, setUnseenIds] = useState<string[]>([]);
  const [needsHomeScreen, setNeedsHomeScreen] = useState(false);

  const seenRef = useRef<Set<string>>(new Set());
  const hydratedRef = useRef(false);
  const audioRef = useRef<AudioContext | null>(null);
  const pollingRef = useRef(true);

  useEffect(() => {
    seenRef.current = new Set(readSeen());
    setSoundOn(window.localStorage.getItem(SOUND_STORAGE_KEY) === "on");

    const supported =
      "Notification" in window &&
      "serviceWorker" in navigator &&
      "PushManager" in window;

    if (!supported) {
      // На iOS вне режима «на домашний экран» PushManager отсутствует.
      setNeedsHomeScreen(isIosSafari() && !isStandalone());
      setPushState("unsupported");
    } else {
      setPushState(
        Notification.permission === "granted"
          ? "granted"
          : Notification.permission === "denied"
            ? "denied"
            : "default",
      );
    }
    hydratedRef.current = true;
  }, []);

  // Уже выданное разрешение проверяем на живую подписку: она могла истечь.
  useEffect(() => {
    if (pushState !== "granted") return;
    let active = true;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();
        if (active && subscription) setPushState("subscribed");
      } catch {
        /* оставляем granted: пользователь сможет подписаться кнопкой */
      }
    })();
    return () => {
      active = false;
    };
  }, [pushState]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  /** Звук по типу события. Работает только после включения кнопкой. */
  const chime = useCallback((kind: StaffNotificationKind) => {
    const context = audioRef.current;
    if (!context) return;
    try {
      if (context.state === "suspended") void context.resume();
      const pattern = SOUND_PATTERN[kind] ?? SOUND_PATTERN.ORDER_NEW;
      pattern.tones.forEach((frequency, index) => {
        const startAt = context.currentTime + index * pattern.gap;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.24, startAt + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.4);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + 0.42);
      });
    } catch {
      /* звук не критичен для работы смены */
    }
  }, []);

  /** Вибрация по типу события. Android поддерживает, iOS игнорирует. */
  const vibrate = useCallback((kind: StaffNotificationKind) => {
    try {
      navigator.vibrate?.(VIBRATION_PATTERN[kind] ?? [200, 100, 200]);
    } catch {
      /* не поддерживается */
    }
  }, []);

  /** Уведомление внутри вкладки. Push при закрытой панели присылает сервер. */
  const showLocalNotification = useCallback((items: StaffNotification[]) => {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      return;
    }
    // Показ через service worker поддерживает vibrate и переживает уход со страницы.
    for (const item of items.slice(0, 3)) {
      void (async () => {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration) {
            await registration.showNotification(item.title, {
              body: item.body,
              tag: item.id,
              icon: "/images/osh-city-emblem.webp",
              badge: "/images/osh-city-emblem.webp",
              data: { url: item.href },
              requireInteraction: item.urgency === "high",
            });
            return;
          }
          new Notification(item.title, { body: item.body, tag: item.id });
        } catch {
          /* браузер может отклонить показ */
        }
      })();
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/staff/notifications", {
        cache: "no-store",
      });
      if (!response.ok) {
        setConnected(false);
        if (response.status === 401 || response.status === 403) {
          pollingRef.current = false;
        }
        return;
      }
      const payload = (await response.json()) as {
        ok: boolean;
        notifications?: StaffNotification[];
        scope?: Scope;
      };
      if (!payload.ok || !payload.notifications) {
        setConnected(false);
        return;
      }
      setConnected(true);

      const incoming = payload.notifications;
      const fresh = incoming.filter((item) => !seenRef.current.has(item.id));
      setNotifications(incoming);
      if (payload.scope) setScope(payload.scope);
      setUnseenIds(fresh.map((item) => item.id));

      if (fresh.length > 0) {
        // Сигналим по самому срочному событию из пачки.
        const lead =
          fresh.find((item) => item.urgency === "high") ?? fresh[0];
        chime(lead.kind);
        vibrate(lead.kind);
        showLocalNotification(fresh);
      }
    } catch {
      setConnected(false);
    }
  }, [chime, showLocalNotification, vibrate]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    void refresh();
    const timer = window.setInterval(() => {
      if (pollingRef.current) void refresh();
    }, POLL_INTERVAL_MS);
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
    for (const item of notifications) seenRef.current.add(item.id);
    writeSeen([...seenRef.current]);
    setUnseenIds([]);
  }

  function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) markAllSeen();
  }

  /** AudioContext можно создать только в обработчике жеста пользователя. */
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
      chime("ORDER_NEW");
      vibrate("ORDER_NEW");
    } catch {
      setSoundOn(false);
    }
  }

  /** Разрешение + регистрация service worker + подписка на сервере. */
  async function enablePush() {
    setPushError(null);
    setPushState("subscribing");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState(permission === "denied" ? "denied" : "default");
        setPushError(
          "Браузер не разрешил уведомления. Включите их в настройках сайта.",
        );
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        setPushState("granted");
        setPushError(
          "На сервере не настроены ключи push. Уведомления придут только в открытую панель.",
        );
        return;
      }

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          // Требование браузеров: показывать уведомление на каждый push.
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToBuffer(vapidKey),
        }));

      const response = await fetch("/api/staff/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setPushState("granted");
        setPushError(payload.error ?? "Не удалось сохранить подписку");
        return;
      }

      setPushState("subscribed");
      if (!soundOn) await toggleSound();
    } catch (error) {
      setPushState("default");
      setPushError(
        error instanceof Error
          ? `Не удалось включить уведомления: ${error.message}`
          : "Не удалось включить уведомления",
      );
    }
  }

  async function sendTest() {
    setTestState("Отправляем…");
    try {
      const response = await fetch("/api/staff/push/test", { method: "POST" });
      const payload = (await response.json()) as {
        ok: boolean;
        sent?: number;
        error?: string;
      };
      setTestState(
        payload.ok
          ? `Отправлено на устройств: ${payload.sent}. Уведомление придёт в течение пары секунд.`
          : (payload.error ?? "Не удалось отправить"),
      );
    } catch {
      setTestState("Нет связи с сервером");
    }
  }

  useEffect(() => {
    if (!soundOn) audioRef.current?.suspend().catch(() => undefined);
  }, [soundOn]);

  const unseenCount = unseenIds.length;
  const urgentCount = useMemo(
    () =>
      notifications.filter(
        (item) => item.urgency === "high" && unseenIds.includes(item.id),
      ).length,
    [notifications, unseenIds],
  );

  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = unseenCount > 0 ? `(${unseenCount}) ${base}` : base;
  }, [unseenCount]);

  const pushReady = pushState === "subscribed";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={
          unseenCount > 0 ? `Уведомления: ${unseenCount} новых` : "Уведомления"
        }
        aria-expanded={open}
         title={unseenCount > 0 ? `${unseenCount} новых уведомлений` : "Уведомления"}
         className={`notification-trigger relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-semibold transition ${
           urgentCount > 0
             ? "notification-trigger-urgent border-red-400/50 bg-red-500/15 text-red-100"
             : open
               ? "notification-trigger-open border-wine-500/50 bg-wine-50 text-wine-700"
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
            className="fixed inset-0 z-30 cursor-default bg-ink-900/40 sm:bg-transparent"
            onClick={() => setOpen(false)}
          />
          {/*
            На телефоне панель — лист снизу на всю ширину: выпадающее меню
            шириной 22rem не вмещалось в экран и уезжало за край.
            От sm показываем обычный дропдаун под колокольчиком.
          */}
          <div className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-2xl border border-cream-200 bg-white p-4 shadow-sheet sm:absolute sm:inset-x-auto sm:bottom-auto sm:right-0 sm:mt-2 sm:max-h-[70vh] sm:w-[22rem] sm:rounded-xl sm:p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-base font-semibold text-ink-900 sm:text-sm">
                Уведомления
              </p>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] ${connected ? "text-ink-400" : "text-red-500"}`}
                >
                  {connected ? "обновление 10 сек" : "нет связи"}
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Закрыть"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-cream-200 text-ink-500 sm:hidden"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="h-4 w-4"
                    aria-hidden="true"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={toggleSound}
                className={`min-h-10 rounded-lg border px-3 text-xs font-semibold transition ${
                  soundOn
                    ? "border-wine-500 bg-wine-50 text-wine-700"
                    : "border-cream-300 text-ink-500"
                }`}
              >
                {soundOn
                  ? "Звук и вибрация включены"
                  : "Включить звук и вибрацию"}
              </button>

              {pushState === "unsupported" ? (
                <p className="rounded-lg bg-cream-100 px-3 py-2 text-[11px] leading-relaxed text-ink-500">
                  {needsHomeScreen
                    ? "На iPhone уведомления работают только из приложения на домашнем экране: «Поделиться» → «На экран Домой», затем откройте панель с него."
                    : "Этот браузер не поддерживает системные уведомления. Счётчик и звук работают."}
                </p>
              ) : pushReady ? (
                <div className="grid gap-2">
                  <span className="min-h-10 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5 text-center text-xs font-semibold text-emerald-700">
                    Уведомления на это устройство включены
                  </span>
                  <button
                    type="button"
                    onClick={sendTest}
                    className="min-h-10 rounded-lg border border-cream-300 px-3 text-xs font-semibold text-ink-600"
                  >
                    Отправить тестовое уведомление
                  </button>
                </div>
              ) : pushState === "denied" ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] leading-relaxed text-red-700">
                  Уведомления запрещены в настройках браузера для этого сайта.
                  Разрешите их и нажмите кнопку снова.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={enablePush}
                  disabled={pushState === "subscribing"}
                  className="min-h-10 rounded-lg border border-wine-500 bg-wine-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {pushState === "subscribing"
                    ? "Включаем…"
                    : "Включить уведомления на телефон"}
                </button>
              )}

              {pushError ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-[11px] leading-relaxed text-red-700">
                  {pushError}
                </p>
              ) : null}
              {testState ? (
                <p className="rounded-lg bg-cream-100 px-3 py-2 text-[11px] leading-relaxed text-ink-600">
                  {testState}
                </p>
              ) : null}
              {!soundOn ? (
                <p className="rounded-lg bg-cream-100 px-3 py-2 text-[11px] leading-relaxed text-ink-500">
                  Браузер разрешает звук только после нажатия — включите его в
                  начале смены.
                </p>
              ) : null}
            </div>

            <div className="mt-3 space-y-2">
              {notifications.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-400">
                  Новых событий нет
                </p>
              ) : null}

              {notifications.map((item) => (
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
                  <p className="mt-1.5 break-words text-sm font-semibold text-ink-900">
                    {item.title}
                  </p>
                  <p className="mt-0.5 break-words text-xs leading-relaxed text-ink-500">
                    {item.body}
                  </p>
                </Link>
              ))}
            </div>

            {!scope.reservations ? (
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
