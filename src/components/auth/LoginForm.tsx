"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { loginAction } from "@/actions/auth";

/**
 * Форма входа для персонала и для панели менеджера.
 * area влияет только на то, куда попадет сотрудник после успешного входа.
 */
export function LoginForm({
  area,
  next,
}: {
  area: "staff" | "manager";
  next?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await loginAction(formData);
      if (!result.ok) {
        setError(result.error ?? "Не удалось войти");
        return;
      }
      setError(null);
      router.replace(result.redirectTo ?? "/staff/orders");
      router.refresh();
    });
  }

  return (
    <form action={submit} className="grid gap-4">
      <input type="hidden" name="area" value={area} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          autoComplete="username"
          placeholder="waiter@demo.ru"
          required
        />
      </div>

      <div>
        <label className="label" htmlFor="password">
          Пароль
        </label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          placeholder="••••••"
          required
        />
      </div>

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={pending}
      >
        {pending ? "Вход..." : "Войти"}
      </button>
    </form>
  );
}
