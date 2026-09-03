"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutManagerAction } from "@/actions/auth";
import { Logo } from "@/components/brand/Logo";
import { NotificationCenter } from "@/components/staff/NotificationCenter";

type Role = "WAITER" | "MANAGER";
const NAV: Array<{ href: string; label: string; roles: Role[] }> = [
  { href: "/manager", label: "Сводка", roles: ["MANAGER"] },
  { href: "/manager/orders", label: "Заказы", roles: ["MANAGER"] },
  { href: "/manager/reservations", label: "Бронирования", roles: ["MANAGER"] },
  { href: "/manager/reports", label: "Отчеты", roles: ["MANAGER"] },
  { href: "/manager/menu", label: "Меню", roles: ["MANAGER"] },
  { href: "/manager/categories", label: "Категории", roles: ["MANAGER"] },
  { href: "/manager/tables", label: "Столы и QR", roles: ["MANAGER"] },
  { href: "/manager/staff", label: "Сотрудники", roles: ["MANAGER"] },
  { href: "/manager/settings", label: "Настройки", roles: ["MANAGER"] },
];

export function ManagerShell({
  restaurantName,
  userName,
  roleLabel,
  role,
  isOrderingEnabled,
  children,
}: {
  restaurantName: string;
  userName: string;
  roleLabel: string;
  role: Role;
  isOrderingEnabled: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV.filter((item) => item.roles.includes(role));
  const isActive = (href: string) =>
    href === "/manager" ? pathname === "/manager" : pathname.startsWith(href);

  return (
    <div className="manager-theme min-h-screen bg-[#151817] lg:flex">
      {mobileOpen ? (
        <button
          aria-label="Закрыть меню"
          className="fixed inset-0 z-30 bg-ink-900/25 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <aside
        className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-cream-200 bg-white px-4 py-5 transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:translate-x-0`}
      >
        <div className="flex items-start justify-between px-2">
          <div className="min-w-0">
            <Logo variant="full" className="h-24 w-24" alt="" />
            <p className="mt-2 truncate text-base font-semibold tracking-tight text-ink-900">
              {restaurantName}
            </p>
            <p className="mt-1 text-xs text-ink-400">Управление рестораном</p>
          </div>
          <button
            type="button"
            className="text-sm text-ink-500 lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            Закрыть
          </button>
        </div>
        <nav className="mt-7 space-y-1">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={
                isActive(item.href)
                  ? "sidebar-link sidebar-link-active"
                  : "sidebar-link"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-cream-200 pt-4">
          <p className="px-2 text-xs text-ink-400">
            Панель менеджера
          </p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-cream-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-3 px-4 lg:px-8">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="btn-ghost btn-sm shrink-0 lg:hidden"
              >
                Меню
              </button>
              {/* Сайдбар с логотипом на мобильных скрыт, поэтому дублируем герб здесь. */}
              <Logo variant="emblem" className="h-9 w-9 shrink-0 lg:hidden" alt="" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">
                  {userName}
                </p>
                <p className="truncate text-xs text-ink-400">{roleLabel}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {/*
                Обёртка обязательна: глобальный CSS панели менеджера задаёт
                span[class*="bg-emerald"] { display: inline-flex !important },
                что перебивало Tailwind-класс hidden и выводило бейдж на телефоне
                поверх имени сотрудника.
              */}
              <span className="hidden sm:block">
                <span
                  className={`badge whitespace-nowrap ${isOrderingEnabled ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                >
                  {isOrderingEnabled ? "Заказы принимаются" : "Заказы отключены"}
                </span>
              </span>
              <NotificationCenter />
              <form action={logoutManagerAction}>
                <button type="submit" className="btn-ghost btn-sm">
                  Выйти
                </button>
              </form>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
