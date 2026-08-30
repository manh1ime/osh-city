export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function StaffLoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-900 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-400">Учкудук</p>
          <h1 className="mt-3 font-display text-3xl text-white">Панель персонала</h1>
          <p className="mt-2 text-sm text-cream-200/70">Заказы со столиков и вызовы официанта</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-card">
          <form action="/api/auth/login" method="post" className="grid gap-4">
            <input type="hidden" name="area" value="staff" />
            <div><label className="label" htmlFor="staff-email">Email</label><input id="staff-email" name="email" type="email" className="input" autoComplete="username" placeholder="waiter@demo.ru" required /></div>
            <div><label className="label" htmlFor="staff-password">Пароль</label><input id="staff-password" name="password" type="password" className="input" autoComplete="current-password" placeholder="••••••" required /></div>
            {searchParams.error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{searchParams.error}</p> : null}
            <button type="submit" className="btn btn-primary w-full">Войти</button>
          </form>
        </div>
      </div>
    </main>
  );
}
