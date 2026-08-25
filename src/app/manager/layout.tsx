import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getRestaurant } from "@/lib/restaurant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const navigation = [
  ["/manager", "Сводка"],
  ["/manager/orders", "Заказы"],
  ["/manager/reports", "Отчёты"],
  ["/manager/menu", "Меню"],
  ["/manager/categories", "Категории"],
  ["/manager/tables", "Столы и QR"],
  ["/manager/staff", "Сотрудники"],
  ["/manager/settings", "Настройки"],
] as const;

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession("manager");

  // Страница входа должна рендериться без защищённой оболочки.
  if (!session) return <>{children}</>;
  if (session.role !== "MANAGER") redirect("/staff/orders");

  const restaurant = await getRestaurant();

  return (
    <div className="manager-theme min-h-screen bg-[#151817] lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-cream-200 bg-white p-4 lg:min-h-screen lg:border-b-0 lg:border-r">
        <div className="mb-4 px-2">
          <p className="font-semibold text-ink-900">{restaurant.name}</p>
          <p className="text-xs text-ink-400">{session.name} · Менеджер</p>
        </div>
        <nav className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1">
          {navigation.map(([href, label]) => (
            <Link key={href} href={href} className="sidebar-link">
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
