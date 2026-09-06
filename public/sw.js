/*
 * Service worker кафе «Ош-Сити».
 *
 * Нужен для Web Push: только он может показать уведомление, когда вкладка
 * закрыта или браузер свёрнут. Без service worker на iOS уведомления
 * недоступны в принципе, а на Android работают лишь в активной вкладке.
 *
 * Кэширование сознательно не делаем: панель работает с живыми заказами,
 * устаревшие данные из кэша опаснее отсутствия офлайн-режима.
 */

// Новый service worker берёт управление сразу, без ожидания закрытия вкладок.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = {};
  }

  const title = payload.title || "Ош-Сити";
  const options = {
    body: payload.body || "Новое событие в панели",
    // Иконка обязательна на Android, иначе показывается силуэт браузера.
    icon: "/images/osh-city-emblem.webp",
    badge: "/images/osh-city-emblem.webp",
    // tag заменяет предыдущее уведомление того же события вместо дубля.
    tag: payload.tag || "osh-city-event",
    // Вибрация задаётся сервером: срочное событие ощущается длиннее.
    vibrate: payload.vibrate || [150, 80, 150],
    // Срочное уведомление не исчезает само: официант мог не смотреть на экран.
    requireInteraction: payload.urgency === "high",
    silent: false,
    data: { url: payload.url || "/staff/orders" },
    timestamp: Date.now(),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // Панель уже открыта: переводим фокус и ведём на нужный раздел,
      // чтобы не плодить вкладки за смену.
      for (const client of windows) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target);
            } catch (error) {
              /* переход мог быть запрещён: фокуса достаточно */
            }
          }
          return;
        }
      }

      await self.clients.openWindow(target);
    })(),
  );
});
