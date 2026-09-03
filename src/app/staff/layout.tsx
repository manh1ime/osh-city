import Link from "next/link";
import { headers } from "next/headers";
import { logoutAction } from "@/actions/auth";
import { Logo } from "@/components/brand/Logo";
import { NotificationCenter } from "@/components/staff/NotificationCenter";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { roleLabel } from "@/lib/permissions";
import { getRestaurant } from "@/lib/restaurant";

export const dynamic = "force-dynamic";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = (await headers()).get("x-uchkuduk-pathname");
  if (pathname === "/staff/login") return <>{children}</>;
  const session = await getSession("staff");

  // Страница /staff/login тоже использует этот layout.
  // Для гостя возвращаем форму входа без панели персонала.
  if (!session) return <>{children}</>;

  const [restaurant, currentStaff] = await Promise.all([
    getRestaurant(),
    prisma.staffUser.findUnique({
      where: { id: session.userId },
      select: { isNightShift: true, branch: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="staff-theme eastern-night-staff-panel min-h-screen bg-[#151817] text-ink-900">
      <header className="sticky top-0 z-20 border-b border-cream-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 max-w-full items-center gap-3">
            <Logo variant="emblem" className="h-11 w-11" alt="" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold tracking-tight">
                {restaurant.name}
              </p>
              <p className="truncate text-xs text-ink-400">
              {session.name} · {roleLabel[session.role]} · {currentStaff?.branch?.name ?? "Все филиалы"} ·{" "}
              {currentStaff?.isNightShift ? "Ночная смена" : "Дневная смена"}
              </p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-1 text-sm font-medium">
            <Link
              href="/staff/orders"
              className="rounded-lg px-3 py-2 text-ink-600 hover:bg-cream-100"
            >
              Заказы
            </Link>
            <Link
              href="/staff/calls"
              className="rounded-lg px-3 py-2 text-ink-600 hover:bg-cream-100"
            >
              Вызовы
            </Link>
            <Link
              href="/staff/reservations"
              className="rounded-lg px-3 py-2 text-ink-600 hover:bg-cream-100"
            >
              Бронирования
            </Link>
            <Link
              href="/staff/summary"
              className="rounded-lg px-3 py-2 text-ink-600 hover:bg-cream-100"
            >
              Моя сводка
            </Link>
            {/* Колокольчик рядом с выходом: виден на любой странице панели. */}
            <NotificationCenter />
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg px-3 py-2 text-ink-400 hover:bg-cream-100 hover:text-ink-700"
              >
                Выйти
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
