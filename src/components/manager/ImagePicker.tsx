"use client";

import { useId, useState } from "react";

type Props = {
  name: string;
  label: string;
  defaultValue?: string | null;
  help?: string;
};

export function ImagePicker({ name, label, defaultValue = "", help }: Props) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);

  async function select(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Выберите изображение");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Файл должен быть не больше 8 МБ");
      return;
    }
    const source = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = source;
    });
    const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const result = canvas.toDataURL("image/jpeg", 0.78);
    if (result.length > 700_000) {
      setError("Изображение слишком большое после обработки. Выберите другое.");
      return;
    }
    setValue(result);
    setError(null);
  }

  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <input type="hidden" name={name} value={value} />
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="input file:mr-3 file:rounded-md file:border-0 file:bg-wine-50 file:px-2 file:py-1 file:text-sm file:font-semibold file:text-wine-700"
        onChange={(event) => void select(event.target.files?.[0])}
      />
      {value ? (
        <div className="mt-2 flex items-center gap-3">
          <img
            src={value}
            alt="Предпросмотр"
            className="h-14 w-14 rounded-lg border border-cream-300 object-cover"
          />
          <button
            type="button"
            className="text-xs font-semibold text-red-600"
            onClick={() => setValue("")}
          >
            Удалить изображение
          </button>
        </div>
      ) : null}
      <p className="mt-1 text-xs text-ink-400">
        {help ??
          "PNG, JPG или WebP до 8 МБ. Изображение сжимается перед сохранением."}
      </p>
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
