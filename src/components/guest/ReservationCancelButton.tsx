"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelMyReservationAction } from "@/actions/reservations";

type Props = {
  code: string;
};

/** Отмена брони со страницы её просмотра. */
export function ReservationCancelButton({ code }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function cancel() {
    if (!window.confirm("Отменить эту бронь?")) return;
    setError(null);

    startTransition(async () => {
      const result = await cancelMyReservationAction(code);
      if (!result.ok) {
        setError(result.error ?? "Не удалось отменить бронь");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-6 border-t border-white/10 pt-5">
      <button
        type="button"
        onClick={cancel}
        disabled={isPending}
        className="btn min-h-11 w-full border border-red-400/30 text-red-200 hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Отменяем…" : "Отменить бронь"}
      </button>
      {error ? (
        <p className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
