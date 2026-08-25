"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  regenerateTableTokenAction,
  saveTableAction,
  toggleTableAction,
} from "@/actions/tables";
import { ConfirmButton, Modal } from "@/components/manager/Modal";

export type TableRow = {
  id: string;
  number: number;
  zone: string | null;
  token: string;
  isActive: boolean;
};

export function TableManager({
  tables,
  baseUrl,
}: {
  tables: TableRow[];
  baseUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [editing, setEditing] = useState<TableRow | null>(null);
  const [isOpen, setOpen] = useState(false);

  function menuUrl(token: string) {
    return `${baseUrl}/menu/${token}`;
  }

  function run(task: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await task();
      setError(result.ok ? null : (result.error ?? "Ошибка"));
      router.refresh();
    });
  }

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await saveTableAction(formData);
      if (!result.ok) {
        setError(result.error ?? "Не удалось сохранить");
        return;
      }
      setError(null);
      setOpen(false);
      setEditing(null);
      router.refresh();
    });
  }

  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(menuUrl(token));
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError("Не удалось скопировать ссылку");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink-900">
            Столы и QR-коды
          </h1>
          <p className="mt-1 text-sm text-ink-500">
            При перегенерации токена старая QR-ссылка перестает работать
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Добавить стол
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {tables.map((table) => (
          <div key={table.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-2xl text-ink-900">
                  Стол № {table.number}
                </p>
                <p className="text-xs text-ink-400">
                  {table.zone ?? "Без зоны"}
                </p>
              </div>
              <span
                className={`badge ${
                  table.isActive
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-cream-200 text-ink-500"
                }`}
              >
                {table.isActive ? "Активен" : "Отключен"}
              </span>
            </div>

            <p className="mt-4 break-all rounded-xl bg-cream-100 px-3 py-2 text-xs text-ink-500">
              {menuUrl(table.token)}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`/api/manager/tables/${table.id}/qr`}
                className="btn btn-dark btn-sm"
                download
              >
                Скачать QR
              </a>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => copyLink(table.token)}
              >
                {copied === table.token ? "Скопировано" : "Копировать ссылку"}
              </button>
              <a
                href={`/menu/${table.token}`}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost btn-sm"
              >
                Открыть меню
              </a>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  setEditing(table);
                  setOpen(true);
                }}
              >
                Изменить
              </button>
              <ConfirmButton
                label={table.isActive ? "Отключить" : "Включить"}
                disabled={pending}
                message={`Изменить статус стола № ${table.number}?`}
                onConfirm={() =>
                  run(() => toggleTableAction(table.id, !table.isActive))
                }
              />
              <ConfirmButton
                label="Перегенерировать QR"
                className="btn-danger btn-sm"
                disabled={pending}
                message={`Перегенерировать токен для стола № ${table.number}? Старая QR-ссылка перестанет работать.`}
                onConfirm={() =>
                  run(() => regenerateTableTokenAction(table.id))
                }
              />
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={isOpen}
        title={editing ? `Стол № ${editing.number}` : "Новый стол"}
        onClose={() => setOpen(false)}
      >
        <form action={submit} className="grid gap-4">
          {editing ? (
            <input type="hidden" name="id" value={editing.id} />
          ) : null}
          <div>
            <label className="label" htmlFor="table-number">
              Номер стола
            </label>
            <input
              id="table-number"
              name="number"
              type="number"
              min={1}
              className="input"
              defaultValue={editing?.number ?? ""}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="table-zone">
              Зона
            </label>
            <input
              id="table-zone"
              name="zone"
              className="input"
              defaultValue={editing?.zone ?? ""}
              placeholder="Основной зал"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={editing ? editing.isActive : true}
            />
            Стол активен
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setOpen(false)}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={pending}
            >
              Сохранить
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
