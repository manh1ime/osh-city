import { LoginForm } from "@/components/auth/LoginForm";
import { getRestaurant } from "@/lib/restaurant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ManagerLoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const restaurant = await getRestaurant();

  return (
    <main className="manager-theme flex min-h-screen items-center justify-center bg-[#151817] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-wine-600">{restaurant.name}</p>
          <h1 className="mt-3 font-display text-3xl text-white">Панель менеджера</h1>
          <p className="mt-2 text-sm text-white/65">Меню, столы, заказы и сотрудники</p>
        </div>
        <div className="card p-6">
          <LoginForm area="manager" next={searchParams.next} />
        </div>
      </div>
    </main>
  );
}
