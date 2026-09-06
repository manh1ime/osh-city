/**
 * Редиректы, которые не теряют домен пользователя.
 *
 * `NextResponse.redirect()` требует абсолютный URL и обычно строит его из
 * `request.url`. На Netlify там стоит внутренний адрес деплоя вида
 * `6a994ed2...--osh-city-cafe.netlify.app`, а не публичный домен. Сессионная
 * cookie при этом ставится host-only на публичный домен, поэтому после
 * редиректа браузер её не отправляет: сессия «теряется» и вход не срабатывает
 * с первого раза.
 *
 * Относительный `Location` браузер разрешает от текущего хоста (RFC 7231),
 * поэтому пользователь остаётся на том домене, где начал, и cookie доезжает.
 * Модуль без серверных зависимостей: работает и в Node, и в Edge (middleware).
 */

/** Относительный редирект. 303 — после POST, 307 — сохранить метод. */
export function redirectToPath(
  path: string,
  status: 303 | 307 | 302 = 303,
  headers: Record<string, string> = {},
): Response {
  return new Response(null, {
    status,
    headers: { Location: path, "Cache-Control": "no-store", ...headers },
  });
}

/**
 * Защита от open redirect: пропускаем только внутренние пути приложения.
 * Отсекаем `//evil.com`, схемы, обратные слеши и служебные маршруты.
 */
export function safeInternalPath(
  value: string | null | undefined,
  fallback: string,
): string {
  if (!value) return fallback;
  const path = value.trim();
  if (!path.startsWith("/")) return fallback;
  // "//host" и "/\host" браузер трактует как внешний адрес.
  if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
  if (path.includes("\\")) return fallback;
  if (path.includes("://")) return fallback;
  // Возврат на форму входа снова показал бы форму: это не цель навигации.
  if (path === "/staff/login" || path === "/manager/login") return fallback;
  if (path.startsWith("/api/")) return fallback;
  return path;
}
