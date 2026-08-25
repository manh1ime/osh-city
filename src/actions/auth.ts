"use server";

import { redirect } from "next/navigation";
import { loginWithPassword, logout } from "@/lib/auth";
import { canAccessManager } from "@/lib/permissions";
import { firstZodError, loginSchema } from "@/lib/validation";

export type LoginResult = {
  ok: boolean;
  error?: string;
  redirectTo?: string;
};

function safeNext(next: string | null, fallback: string): string {
  // Защита от open redirect: разрешаем только внутренние пути
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next === "/staff/login" || next === "/manager/login") return fallback;
  return next;
}

/**
 * Вход сотрудника (панель персонала и панель менеджера используют одну и ту же форму).
 * Редирект выполняет клиент, чтобы можно было показать ошибку без перезагрузки страницы.
 */
export async function loginAction(formData: FormData): Promise<LoginResult> {
  const area = formData.get("area") === "manager" ? "manager" : "staff";
  const next =
    typeof formData.get("next") === "string"
      ? (formData.get("next") as string)
      : null;

  const parsed = loginSchema.safeParse({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: firstZodError(parsed.error) };
  }

  const result = await loginWithPassword(
    parsed.data.email,
    parsed.data.password,
    area,
  );
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const role = result.session.role;

  // Официант не имеет доступа в панель менеджера: ведем его в панель персонала
  if (area === "manager" && !canAccessManager(role)) {
    return { ok: true, redirectTo: "/staff/orders" };
  }

  const fallback =
    area === "manager"
      ? "/manager"
      : role === "WAITER"
        ? "/staff/orders"
        : "/staff/orders";
  return { ok: true, redirectTo: safeNext(next, fallback) };
}

/** Выход: используется напрямую в <form action={logoutAction}>. */
export async function logoutAction(): Promise<void> {
  await logout("staff");
  redirect("/staff/login");
}

/** Выход из панели менеджера. */
export async function logoutManagerAction(): Promise<void> {
  await logout("manager");
  redirect("/manager/login");
}
