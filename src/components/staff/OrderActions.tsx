"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { changeOrderStatusAction } from "@/actions/orders";

type OrderStatus =
  "NEW" | "ACCEPTED" | "SENT_TO_KITCHEN" | "COMPLETED" | "CANCELED";

/** Кнопки смены статуса на детальной странице заказа. */
export function OrderActions({
  orderId,
  status,
  orderNumber,
}: {
  orderId: string;
  status: OrderStatus;
  orderNumber: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(nextStatus: OrderStatus) {
    setError(null);
    startTransition(async () => {
      const result = await changeOrderStatusAction(orderId, nextStatus);
      if (!result.ok) {
        setError(result.error ?? "Не удалось изменить статус");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-5 border-t border-white/10 pt-4">
      {error ? (
        <p className="mb-3 rounded-xl bg-red-500/15 px-4 py-2 text-xs text-red-200">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {status === "NEW" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run("ACCEPTED")}
            className="btn-primary btn-sm"
          >
            Принять заказ
          </button>
        ) : null}
        {status === "ACCEPTED" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run("SENT_TO_KITCHEN")}
            className="btn-primary btn-sm"
          >
            Передать на кухню
          </button>
        ) : null}
        {status === "SENT_TO_KITCHEN" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => run("COMPLETED")}
            className="btn-primary btn-sm"
          >
            Завершить
          </button>
        ) : null}
        {status === "NEW" || status === "ACCEPTED" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (window.confirm(`Отменить заказ № ${orderNumber}?`))
                run("CANCELED");
            }}
            className="btn-sm rounded-xl border border-red-400/40 px-3 py-2 text-xs font-semibold text-red-200"
          >
            Отменить заказ
          </button>
        ) : null}
        {status === "COMPLETED" || status === "CANCELED" ? (
          <p className="text-xs text-cream-200/50">
            Заказ закрыт, действия недоступны
          </p>
        ) : null}
      </div>
    </div>
  );
}
