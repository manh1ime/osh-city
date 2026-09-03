"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

/**
 * Границы ошибок раньше не было, поэтому любой сбой server action
 * показывал системный текст «Application error» без пути назад.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="guest-theme flex min-h-screen flex-col items-center justify-center bg-[#121514] px-6 py-16 text-center">
      <Logo variant="full" className="h-32 w-32" />
      <h1 className="guest-display mt-6 text-3xl font-semibold tracking-[-0.03em] text-white">
        Что-то пошло не так
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-white/55">
        Действие не удалось выполнить. Повторите попытку — данные не потеряны.
        Если ошибка повторяется, сообщите менеджеру.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-primary min-h-11">
          Повторить
        </button>
        <Link
          href="/"
          className="btn min-h-11 border border-white/20 text-white hover:bg-white/10"
        >
          На главную
        </Link>
      </div>
      {error.digest ? (
        <p className="mt-6 text-[11px] tracking-wide text-white/25">
          Код ошибки: {error.digest}
        </p>
      ) : null}
    </main>
  );
}
