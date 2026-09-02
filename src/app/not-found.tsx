import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

/**
 * Общая страница 404. Раньше её не было, поэтому гость с неверным кодом брони
 * (notFound() в /reservation/[code]) попадал на дефолтный экран Next.js
 * без брендинга и без пути назад.
 */
export default function NotFound() {
  return (
    <main className="guest-theme flex min-h-screen flex-col items-center justify-center bg-[#121514] px-6 py-16 text-center">
      <Logo variant="full" className="h-36 w-36" />
      <h1 className="guest-display mt-6 text-3xl font-semibold tracking-[-0.03em] text-white">
        Страница не найдена
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/55">
        Проверьте ссылку или код брони. Если код верный, обратитесь к сотруднику
        кафе — он найдёт бронь в системе.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn btn-primary min-h-11">
          На главную
        </Link>
        <Link
          href="/my-reservations"
          className="btn min-h-11 border border-white/20 text-white hover:bg-white/10"
        >
          Мои бронирования
        </Link>
      </div>
    </main>
  );
}
