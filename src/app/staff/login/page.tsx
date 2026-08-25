import { LoginForm } from "@/components/auth/LoginForm";
import { getRestaurant } from "@/lib/restaurant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const restaurant = await getRestaurant();

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-400">{restaurant.name}</p>
          <h1 className="mt-3 font-display text-3xl text-white">Панель персонала</h1>
          <p className="mt-2 text-sm text-cream-200/70">Заказы со столиков и вызовы официанта</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-card">
          <LoginForm area="staff" next={searchParams.next} />
        </div>
      </div>
    </main>
  );
}
