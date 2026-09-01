"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  deleteMenuItemAction,
  saveMenuItemAction,
  toggleMenuItemAction,
} from "@/actions/menu";
import { ConfirmButton, Modal } from "@/components/manager/Modal";
import { ImagePicker } from "@/components/manager/ImagePicker";
import { formatMoney, parseBadges } from "@/lib/format";

export type MenuItemRow = {
  id: string;
  name: string;
  description: string | null;
  ingredients: string | null;
  allergens: string | null;
  price: number;
  weight: string | null;
  imageUrl: string | null;
  badges: string | null;
  isActive: boolean;
  isStopListed: boolean;
  sortOrder: number;
  categoryId: string;
  categoryName: string;
};

export type CategoryOption = { id: string; name: string };

export function MenuManager({
  items,
  categories,
  currency,
}: {
  items: MenuItemRow[];
  categories: CategoryOption[];
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [editing, setEditing] = useState<MenuItemRow | null>(null);
  const [isOpen, setOpen] = useState(false);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter && item.categoryId !== categoryFilter) return false;
      if (statusFilter === "active" && !item.isActive) return false;
      if (statusFilter === "hidden" && item.isActive) return false;
      if (statusFilter === "stop" && !item.isStopListed) return false;
      if (!query) return true;
      return (
        item.name.toLowerCase().includes(query) ||
        (item.description ?? "").toLowerCase().includes(query)
      );
    });
  }, [items, search, categoryFilter, statusFilter]);

  function openCreate() {
    setEditing(null);
    setError(null);
    setOpen(true);
  }

  function openEdit(item: MenuItemRow) {
    setEditing(item);
    setError(null);
    setOpen(true);
  }

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveMenuItemAction(formData);
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

  function runToggle(
    id: string,
    field: "isActive" | "isStopListed",
    value: boolean,
  ) {
    startTransition(async () => {
      const result = await toggleMenuItemAction(id, field, value);
      if (!result.ok) setError(result.error ?? "Ошибка");
      router.refresh();
    });
  }

  function runDelete(id: string) {
    startTransition(async () => {
      const result = await deleteMenuItemAction(id);
      if (!result.ok) setError(result.error ?? "Ошибка");
      router.refresh();
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-ink-900">Меню</h1>
          <p className="mt-1 text-sm text-ink-500">Блюд: {items.length}</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreate}>
          Добавить блюдо
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <p className="mt-4 rounded-xl border border-cream-200 bg-cream-100 px-4 py-3 text-sm text-ink-600">
        Активные блюда сразу появляются в гостевом меню:{" "}
        <a
          href="/menu"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-wine-700 underline"
        >
          открыть просмотр
        </a>
        . Скрытые блюда и выключенные категории гостю не видны.
      </p>

      <div className="card mt-5 grid gap-3 p-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="menu-search">
            Поиск
          </label>
          <input
            id="menu-search"
            className="input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Название или описание"
          />
        </div>
        <div>
          <label className="label" htmlFor="menu-category">
            Категория
          </label>
          <select
            id="menu-category"
            className="input"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="">Все</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="menu-status">
            Статус
          </label>
          <select
            id="menu-status"
            className="input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">Все</option>
            <option value="active">Активные</option>
            <option value="hidden">Скрытые</option>
            <option value="stop">Стоп-лист</option>
          </select>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="card flex flex-wrap items-center gap-4 p-4"
          >
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-cream-200">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-[200px] flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink-900">{item.name}</p>
                {parseBadges(item.badges).map((badge) => (
                  <span key={badge} className="badge bg-gold-100 text-gold-700">
                    {badge}
                  </span>
                ))}
                {!item.isActive ? (
                  <span className="badge bg-cream-200 text-ink-500">
                    Скрыто
                  </span>
                ) : null}
                {item.isStopListed ? (
                  <span className="badge bg-red-100 text-red-700">
                    Стоп-лист
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-ink-400">
                {item.categoryName}
                {item.weight ? ` · ${item.weight}` : ""}
              </p>
              {item.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-ink-500">
                  {item.description}
                </p>
              ) : null}
            </div>
            <p className="w-24 text-right font-display text-lg">
              {formatMoney(item.price, currency)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn-ghost btn-sm"
                onClick={() => openEdit(item)}
              >
                Изменить
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={pending}
                onClick={() => runToggle(item.id, "isActive", !item.isActive)}
              >
                {item.isActive ? "Скрыть" : "Показать"}
              </button>
              <button
                type="button"
                className="btn-ghost btn-sm"
                disabled={pending}
                onClick={() =>
                  runToggle(item.id, "isStopListed", !item.isStopListed)
                }
              >
                {item.isStopListed ? "Снять стоп" : "Стоп-лист"}
              </button>
              <ConfirmButton
                label="Удалить"
                className="btn-danger btn-sm"
                disabled={pending}
                message={`Удалить блюдо «${item.name}»? Если по нему есть заказы, оно будет архивировано.`}
                onConfirm={() => runDelete(item.id)}
              />
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className="card p-8 text-center text-ink-400">Ничего не найдено</p>
        ) : null}
      </div>

      <Modal
        open={isOpen}
        title={editing ? "Редактирование блюда" : "Новое блюдо"}
        onClose={() => setOpen(false)}
      >
        <form
          key={editing?.id ?? "new-menu-item"}
          action={submit}
          className="grid gap-4 sm:grid-cols-2"
        >
          {editing ? (
            <input type="hidden" name="id" value={editing.id} />
          ) : null}
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">
              Название
            </label>
            <input
              id="name"
              name="name"
              className="input"
              defaultValue={editing?.name ?? ""}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="categoryId">
              Категория
            </label>
            <select
              id="categoryId"
              name="categoryId"
              className="input"
              defaultValue={editing?.categoryId ?? categories[0]?.id ?? ""}
              required
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="price">
              Цена ({currency})
            </label>
            <input
              id="price"
              name="price"
              type="number"
              min={0}
              className="input"
              defaultValue={editing?.price ?? 0}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="weight">
              Вес / объем
            </label>
            <input
              id="weight"
              name="weight"
              className="input"
              defaultValue={editing?.weight ?? ""}
            />
          </div>
          <div>
            <label className="label" htmlFor="sortOrder">
              Порядок
            </label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              min={0}
              className="input"
              defaultValue={editing?.sortOrder ?? 0}
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
              defaultValue={editing?.description ?? ""}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="ingredients">
              Состав
            </label>
            <textarea
              id="ingredients"
              name="ingredients"
              rows={2}
              className="input"
              defaultValue={editing?.ingredients ?? ""}
            />
          </div>
          <div>
            <label className="label" htmlFor="allergens">
              Аллергены
            </label>
            <input
              id="allergens"
              name="allergens"
              className="input"
              defaultValue={editing?.allergens ?? ""}
            />
          </div>
          <div>
            <label className="label" htmlFor="badges">
              Бейджи (через запятую)
            </label>
            <input
              id="badges"
              name="badges"
              className="input"
              defaultValue={editing?.badges ?? ""}
            />
          </div>
          <div className="sm:col-span-2">
            <ImagePicker
              name="imageUrl"
              label="Фотография блюда"
              defaultValue={editing?.imageUrl}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={editing ? editing.isActive : true}
            />
            Блюдо активно в меню
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="isStopListed"
              defaultChecked={editing ? editing.isStopListed : false}
            />
            В стоп-листе
          </label>
          {error ? (
            <p className="sm:col-span-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div className="sm:col-span-2 flex justify-end gap-2">
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
              {pending ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
