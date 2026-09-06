import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { isPushConfigured } from "@/lib/push";
import { notificationScope } from "@/lib/notifications";
import { roleLabel } from "@/lib/permissions";
import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Страница самопроверки уведомлений.
 *
 * Сотрудник видит, что именно настроено, и может проверить цепочку целиком,
 * не дожидаясь реального заказа: разрешение браузера, подписка устройства,
 * ключи на сервере, тестовая отправка.
 */
export default async function StaffNotificationsPage() {
  const session = (await getSession("staff")) ?? (await getSession("manager"));
  if (!session) redirect("/staff/login?next=/staff/notifications");

  const scope = notificationScope(session.role);
  const pushConfigured = isPushConfigured();
  const devices = await prisma.pushDevice.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      userAgent: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

  const events: Array<{ label: string; enabled: boolean }> = [
    { label: "Новый заказ со столика", enabled: scope.orders },
    { label: "Заказ долго не принят", enabled: scope.orders },
    { label: "Вызов официанта и просьба счёта", enabled: scope.calls },
    { label: "Новая бронь стола", enabled: scope.reservations },
    { label: "Новый предзаказ к брони", enabled: scope.reservations },
    { label: "Предзаказ готов", enabled: scope.reservations },
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/45">
            {session.name} · {roleLabel[session.role]}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            Проверка уведомлений
          </h1>
        </div>
        <Link
          href={session.role === "MANAGER" ? "/manager" : "/staff/orders"}
          className="btn btn-sm shrink-0 border border-white/20 text-white hover:bg-white/10"
        >
          Назад
        </Link>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">
          Как включить на телефоне
        </h2>
        <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-white/70">
          <li>
            <strong className="text-white">1.</strong> На iPhone сначала добавьте
            панель на домашний экран: «Поделиться» → «На экран Домой». Safari
            присылает уведомления только оттуда. На Android этот шаг не нужен.
          </li>
          <li>
            <strong className="text-white">2.</strong> Откройте колокольчик в
            шапке и нажмите «Включить уведомления на телефон». Браузер спросит
            разрешение — согласитесь.
          </li>
          <li>
            <strong className="text-white">3.</strong> Нажмите «Отправить
            тестовое уведомление». Оно должно прийти в течение пары секунд, даже
            если свернуть браузер.
          </li>
          <li>
            <strong className="text-white">4.</strong> Проверьте, что на телефоне
            не включён режим «Не беспокоить», а звук браузера не выключен
            отдельно.
          </li>
        </ol>
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">Состояние</h2>
        <dl className="mt-3 space-y-3 text-sm">
          <div className="flex items-start justify-between gap-4 border-t border-white/10 pt-3">
            <dt className="text-white/50">Ключи push на сервере</dt>
            <dd
              className={pushConfigured ? "text-emerald-300" : "text-red-300"}
            >
              {pushConfigured ? "настроены" : "не настроены"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-t border-white/10 pt-3">
            <dt className="text-white/50">Подписано устройств</dt>
            <dd className="text-white/85">{devices.length}</dd>
          </div>
          <div className="flex items-start justify-between gap-4 border-t border-white/10 pt-3">
            <dt className="text-white/50">Зал</dt>
            <dd className="text-right text-white/85">
              Ош-Сити · Ленинский проспект, 148
            </dd>
          </div>
        </dl>

        {!pushConfigured ? (
          <p className="mt-4 rounded-lg border border-[#B7833E]/30 bg-[#B7833E]/10 px-4 py-3 text-xs leading-relaxed text-[#E0B472]">
            Администратору: задайте переменные NEXT_PUBLIC_VAPID_PUBLIC_KEY,
            VAPID_PRIVATE_KEY и VAPID_SUBJECT в настройках хостинга. Без них
            уведомления приходят только в открытую панель.
          </p>
        ) : null}
      </section>

      <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-base font-semibold text-white">
          Что приходит вашей роли
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          {events.map((event) => (
            <li
              key={event.label}
              className="flex items-center justify-between gap-3 border-t border-white/10 pt-2"
            >
              <span className="text-white/75">{event.label}</span>
              <span
                className={
                  event.enabled
                    ? "shrink-0 text-emerald-300"
                    : "shrink-0 text-white/35"
                }
              >
                {event.enabled ? "приходит" : "не приходит"}
              </span>
            </li>
          ))}
        </ul>
        {!scope.reservations ? (
          <p className="mt-3 text-xs leading-relaxed text-white/45">
            Бронями и предзаказами занимается старший официант, поэтому официанту
            они не приходят.
          </p>
        ) : null}
      </section>

      {devices.length > 0 ? (
        <section className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-base font-semibold text-white">Ваши устройства</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {devices.map((device) => (
              <li key={device.id} className="border-t border-white/10 pt-3">
                <p className="break-words text-white/75">
                  {device.userAgent ?? "Устройство без описания"}
                </p>
                <p className="mt-1 text-xs text-white/40">
                  подключено {formatDateTime(device.createdAt)}
                  {device.lastUsedAt
                    ? ` · последнее уведомление ${formatDateTime(device.lastUsedAt)}`
                    : " · уведомлений ещё не было"}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
