export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ManagerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="manager-theme flex min-h-screen items-center justify-center bg-[#151817] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img
            src="/images/uchkuduk-logo.webp"
            alt="Логотип Учкудук"
            className="mx-auto h-40 w-40 rounded-2xl object-contain"
          />

          <h1 className="mt-3 font-display text-3xl text-white">
            Панель менеджера
          </h1>

          <p className="mt-2 text-sm text-white/65">
            Меню, столы, заказы и сотрудники
          </p>
        </div>

        <div className="card p-6">
          <form
            action="/api/auth/login"
            method="post"
            className="grid gap-4"
          >
            <input type="hidden" name="area" value="manager" />

            <div>
              <label className="label" htmlFor="manager-email">
                Email
              </label>

              <input
                id="manager-email"
                name="email"
                type="email"
                className="input"
                autoComplete="username"
                placeholder="manager@demo.ru"
                required
              />
            </div>

            <div>
              <label className="label" htmlFor="manager-password">
                Пароль
              </label>

              <input
                id="manager-password"
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
