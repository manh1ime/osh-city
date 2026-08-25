"use client";

import { useEffect, useState } from "react";

type Status = "NEW" | "ACCEPTED" | "SENT_TO_KITCHEN" | "COMPLETED" | "CANCELED";

const LABELS: Record<Status, string> = {
  NEW: "Отправлен официанту",
  ACCEPTED: "Официант принял заказ",
  SENT_TO_KITCHEN: "Передан на кухню",
  COMPLETED: "Выполнен",
  CANCELED: "Отменен",
};

const STEPS: Status[] = ["NEW", "ACCEPTED", "SENT_TO_KITCHEN", "COMPLETED"];

/** Статус заказа обновляется поллингом каждые 5 секунд. */
export function OrderStatusLive({
  orderId,
  initialStatus,
}: {
  orderId: string;
  initialStatus: Status;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);

  useEffect(() => {
    if (status === "COMPLETED" || status === "CANCELED") return;
    let active = true;
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/guest/order/${orderId}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          ok: boolean;
          status?: Status;
        };
        if (active && payload.ok && payload.status) setStatus(payload.status);
      } catch {
        /* повторим на следующем тике */
      }
    }, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [orderId, status]);

  const canceled = status === "CANCELED";
  const currentIndex = STEPS.indexOf(status);

  return (
    <div className="mt-5">
      <div
        className={`rounded-xl px-4 py-3 text-center text-sm font-semibold ${
          canceled ? "bg-red-50 text-red-700" : "bg-wine-50 text-wine-800"
        }`}
      >
        {LABELS[status]}
      </div>

      {!canceled ? (
        <div className="mt-4 flex gap-1.5">
          {STEPS.map((step, index) => (
            <div key={step} className="flex-1">
              <div
                className={`h-1.5 rounded-full ${
                  index <= currentIndex ? "bg-wine-600" : "bg-cream-200"
                }`}
              />
              <p className="mt-1.5 text-[10px] leading-tight text-ink-400">
                {LABELS[step]}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <p className="mt-3 text-center text-[11px] text-ink-400">
        Страница обновляется автоматически
      </p>
    </div>
  );
}
