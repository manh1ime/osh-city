import { Logo } from "@/components/brand/Logo";
import { safeInternalPath } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function StaffLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  // Куда вернуть после входа. Значение приходит из middleware.
  const destination = safeInternalPath(next, "/staff/orders");

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo variant="full" className="mx-auto h-40 w-40" />
          <h1 className="mt-3 font-display text-3xl text-white">
            Панель персонала
          </h1>
          <p className="mt-2 text-sm text-cream-200/70">
            Заказы со столиков и вызовы официанта
          </p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-card">
          <form action="/api/auth/login" method="post" className="grid gap-4">
            <input type="hidden" name="area" value="staff" />
            <input type="hidden" name="next" value={destination} />
            <div>
              <label className="label" htmlFor="staff-email">
                Email
              </label>
              <input
                id="staff-email"
                name="email"
                type="email"
                className="input"
                autoComplete="username"
                placeholder="waiter@demo.ru"
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="staff-password">
                Пароль
              </label>
              <input
                id="staff-password"
                name="password"
                type="password"
                className="input"
                autoComplete="current-password"
                placeholder="••••••"
                required
              />
            </div>
            {error ? (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}
            <button type="submit" className="btn btn-primary w-full">
              Войти
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
