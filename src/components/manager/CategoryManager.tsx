"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteCategoryAction,
  moveCategoryAction,
  saveCategoryAction,
  toggleCategoryAction,
} from "@/actions/categories";
import { ConfirmButton, Modal } from "@/components/manager/Modal";

export type CategoryRow = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  itemsCount: number;
};

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [isOpen, setOpen] = useState(false);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await saveCategoryAction(formData);
      if (!result.ok) {
        setError(result.error ?? "Не удалось сохранить");
        return;
      }
      setOpen(false);
      setEditing(null);
      setError(null);
      router.refresh();
    });
  }

  function run(task: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await task();
      setError(result.ok ? null : (result.error ?? "Ошибка"));
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink-900">Категории</h1>
          <p className="mt-1 text-sm text-ink-500">
            Меняйте расположение стрелками. Категории показываются гостю в этом
            порядке.
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
          Добавить категорию
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-5 grid gap-3">
        {categories.map((category, index) => (
          <div
            key={category.id}
            className="card flex flex-wrap items-center gap-4 p-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-ink-900">{category.name}</p>
                {!category.isActive ? (
                  <span className="badge bg-cream-200 text-ink-500">
                    Выключена
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-ink-400">
                Блюд: {category.itemsCount} · позиция в меню: {index + 1}
              </p>
              {category.description ? (
                <p className="mt-1 text-sm text-ink-500">
                  {category.description}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={pending || index === 0}
                onClick={() => run(() => moveCategoryAction(category.id, "up"))}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={pending || index === categories.length - 1}
                onClick={() =>
                  run(() => moveCategoryAction(category.id, "down"))
                }
              >
                ↓
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => {
                  setEditing(category);
                  setOpen(true);
                }}
              >
                Изменить
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={pending}
                onClick={() =>
                  run(() =>
                    toggleCategoryAction(category.id, !category.isActive),
                  )
                }
              >
                {category.isActive ? "Выключить" : "Включить"}
              </button>
              <ConfirmButton
                label="Удалить"
                className="btn-danger btn-sm"
                disabled={pending}
                message={`Удалить категорию «${category.name}»?`}
                onConfirm={() => run(() => deleteCategoryAction(category.id))}
              />
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={isOpen}
        title={editing ? "Редактирование категории" : "Новая категория"}
        onClose={() => setOpen(false)}
      >
        <form action={submit} className="grid gap-4">
          {editing ? (
            <input type="hidden" name="id" value={editing.id} />
          ) : null}
          <div>
            <label className="label" htmlFor="category-name">
              Название
            </label>
            <input
              id="category-name"
              name="name"
              className="input"
              defaultValue={editing?.name ?? ""}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="category-description">
              Описание
            </label>
            <input
              id="category-description"
              name="description"
              className="input"
              defaultValue={editing?.description ?? ""}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={editing ? editing.isActive : true}
            />
            Категория активна
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
