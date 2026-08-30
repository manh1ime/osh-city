"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveStaffAction, toggleStaffAction } from "@/actions/staff";
import { ConfirmButton, Modal } from "@/components/manager/Modal";

export type StaffRow = {
  id: string;
  name: string;
  email: string;
  role: "WAITER" | "SENIOR_WAITER" | "MANAGER";
  branchId: string | null;
  isNightShift: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
};

/** Филиалы кафе для выбора места работы сотрудника. */
export type StaffBranchOption = {
  id: string;
  name: string;
  address: string;
};

const ROLE_LABEL: Record<StaffRow["role"], string> = {
  WAITER: "Официант",
  SENIOR_WAITER: "Старший официант",
  MANAGER: "Менеджер",
};

export function StaffManager({
  staff,
  branches = [],
  currentUserId,
}: {
  staff: StaffRow[];
  branches?: StaffBranchOption[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [isOpen, setOpen] = useState(false);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await saveStaffAction(formData);
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

  function toggle(row: StaffRow) {
    startTransition(async () => {
      const result = await toggleStaffAction(row.id, !row.isActive);
      setError(result.ok ? null : (result.error ?? "Ошибка"));
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink-900">Сотрудники</h1>
          <p className="mt-1 text-sm text-ink-500">
            Каждый официант закреплён за филиалом и видит его заказы. Менеджер
            управляет обоими кафе
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
          Добавить сотрудника
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="card mt-5 overflow-x-auto p-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="table-head">
              <th className="px-4 py-3 text-left">Имя</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Роль</th>
              <th className="px-4 py-3 text-left">Филиал</th>
              <th className="px-4 py-3 text-left">Смена</th>
              <th className="px-4 py-3 text-left">Статус</th>
              <th className="px-4 py-3 text-left">Последний вход</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {staff.map((row) => (
              <tr key={row.id} className="border-t border-cream-200">
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3 text-ink-500">{row.email}</td>
                <td className="px-4 py-3">{ROLE_LABEL[row.role]}</td>
                <td className="px-4 py-3 text-ink-500">
                  {branches.find((item) => item.id === row.branchId)?.name ??
                    (row.role === "MANAGER" ? "Оба филиала" : "Не задан")}
                </td>
                <td className="px-4 py-3 text-ink-500">
                  {row.isNightShift ? "Ночная смена" : "Дневная смена"}
                </td>
                <td className="px-4 py-3 text-ink-500">
                  {row.isActive ? "Активен" : "Отключен"}
                </td>
                <td className="px-4 py-3 text-ink-500">
                  {row.lastLoginAt ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      className="btn-ghost btn-sm"
                      onClick={() => {
                        setEditing(row);
                        setOpen(true);
                      }}
                    >
                      Изменить
                    </button>
                    <ConfirmButton
                      label={row.isActive ? "Деактивировать" : "Активировать"}
                      className={
                        row.isActive ? "btn-danger btn-sm" : "btn-ghost btn-sm"
                      }
                      disabled={pending || row.id === currentUserId}
                      message={`Изменить доступ сотрудника ${row.name}?`}
                      onConfirm={() => toggle(row)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={isOpen}
        title={editing ? `Сотрудник: ${editing.name}` : "Новый сотрудник"}
        onClose={() => setOpen(false)}
      >
        <form action={submit} className="grid gap-4 sm:grid-cols-2">
          {editing ? (
            <input type="hidden" name="id" value={editing.id} />
          ) : null}
          <div>
            <label className="label" htmlFor="staff-name">
              Имя
            </label>
            <input
              id="staff-name"
              name="name"
              className="input"
              defaultValue={editing?.name ?? ""}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="staff-email">
              Email
            </label>
            <input
              id="staff-email"
              name="email"
              type="email"
              className="input"
              defaultValue={editing?.email ?? ""}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="staff-role">
              Роль
            </label>
            <select
              id="staff-role"
              name="role"
              className="input"
              defaultValue={editing?.role ?? "WAITER"}
            >
              <option value="WAITER">Официант</option>
              <option value="SENIOR_WAITER">Старший официант</option>
              <option value="MANAGER">Менеджер</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="staff-branch">
              Филиал
            </label>
            <select
              id="staff-branch"
              name="branchId"
              className="input"
              defaultValue={editing?.branchId ?? ""}
            >
              <option value="">Без привязки (менеджер)</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}, {branch.address}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-400">
              Для официанта филиал обязателен
            </p>
          </div>
          <div>
            <label className="label" htmlFor="staff-password">
              {editing ? "Новый пароль (необязательно)" : "Пароль"}
            </label>
            <input
              id="staff-password"
              name="password"
              type="password"
              className="input"
              autoComplete="new-password"
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="isNightShift"
              defaultChecked={editing?.isNightShift ?? false}
            />
            Ночная смена
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={editing ? editing.isActive : true}
            />
            Сотрудник может входить в систему
          </label>
          <div className="flex justify-end gap-2 sm:col-span-2">
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
