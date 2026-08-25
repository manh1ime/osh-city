"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveSettingsAction } from "@/actions/settings";
import { ImagePicker } from "@/components/manager/ImagePicker";

export type SettingsValues = {
  name: string;
  description: string | null;
  address: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  primaryColor: string;
  currency: string;
  isOrderingEnabled: boolean;
};

export function SettingsForm({ values }: { values: SettingsValues }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: "ok" | "error";
    text: string;
  } | null>(null);
  const [orderingEnabled, setOrderingEnabled] = useState(
    values.isOrderingEnabled,
  );

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await saveSettingsAction(formData);
      setMessage(
        result.ok
          ? { type: "ok", text: "Настройки сохранены" }
          : { type: "error", text: result.error ?? "Не удалось сохранить" },
      );
      router.refresh();
    });
  }

  function onToggleOrdering(next: boolean) {
    if (
      !next &&
      !window.confirm(
        "Отключить прием заказов? Гости не смогут отправлять заказы.",
      )
    ) {
      return;
    }
    setOrderingEnabled(next);
  }

  return (
    <div>
      <h1 className="font-display text-3xl text-ink-900">
        Настройки ресторана
      </h1>
      <p className="mt-1 text-sm text-ink-500">
        Эти данные меняются при передаче проекта другому клиенту
      </p>

      {message ? (
        <p
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <form action={submit} className="card mt-5 grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="name">
            Название
          </label>
          <input
            id="name"
            name="name"
            className="input"
            defaultValue={values.name}
            required
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">
            Описание
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            className="input"
            defaultValue={values.description ?? ""}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="address">
            Адрес
          </label>
          <input
            id="address"
            name="address"
            className="input"
            defaultValue={values.address ?? ""}
          />
        </div>
        <ImagePicker
          name="logoUrl"
          label="Логотип"
          defaultValue={values.logoUrl}
        />
        <ImagePicker
          name="coverImageUrl"
          label="Фотография ресторана"
          defaultValue={values.coverImageUrl}
        />
        <div>
          <label className="label" htmlFor="primaryColor">
            Основной цвет
          </label>
          <input
            id="primaryColor"
            name="primaryColor"
            type="color"
            className="input h-12"
            defaultValue={values.primaryColor}
          />
        </div>
        <div>
          <label className="label" htmlFor="currency">
            Валюта
          </label>
          <input
            id="currency"
            name="currency"
            className="input"
            defaultValue={values.currency}
            required
          />
        </div>
        <div className="sm:col-span-2 rounded-xl bg-cream-100 p-4">
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="checkbox"
              name="isOrderingEnabled"
              checked={orderingEnabled}
              onChange={(event) => onToggleOrdering(event.target.checked)}
            />
            Прием заказов включен
          </label>
          <p className="mt-1 text-xs text-ink-500">
            При выключении гости видят меню, но не могут отправить заказ
          </p>
        </div>
        <div className="sm:col-span-2 flex justify-end">
          <button type="submit" className="btn btn-primary" disabled={pending}>
            {pending ? "Сохранение..." : "Сохранить настройки"}
          </button>
        </div>
      </form>
    </div>
  );
}
